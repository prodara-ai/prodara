// ---------------------------------------------------------------------------
// Incremental Spec module tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { buildIncrementalSpec, serializeIncrementalSpec } from '../src/incremental/incremental-spec.js';
import type { Plan } from '../src/planner/plan-types.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGraph(
  modules: ModuleNode[],
  edges: { from: string; to: string; kind: string }[] = [],
): ProductGraph {
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product', kind: 'product', name: 'test', title: null, version: null,
      modules: modules.map((m) => m.id), publishes: null,
    },
    modules,
    edges: edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind as 'contains' })),
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };
}

function makeModule(name: string, items: { id: string; kind: string; name: string }[]): ModuleNode {
  const mod: Record<string, unknown> = { id: name, kind: 'module', name, imports: [] };
  for (const item of items) {
    const cat = item.kind + 's';
    if (!mod[cat]) mod[cat] = [];
    (mod[cat] as unknown[]).push(item);
  }
  return mod as unknown as ModuleNode;
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    format: 'prodara-plan',
    version: '0.1.0',
    changes: overrides.changes ?? [],
    impacts: overrides.impacts ?? [],
    tasks: overrides.tasks ?? [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildIncrementalSpec', () => {
  it('produces a valid incremental spec from empty plan', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan();
    const spec = buildIncrementalSpec(plan, graph);

    expect(spec.format).toBe('prodara-incremental-spec');
    expect(spec.version).toBe('0.1.0');
    expect(spec.summary.addedCount).toBe(0);
    expect(spec.summary.removedCount).toBe(0);
    expect(spec.summary.modifiedCount).toBe(0);
    expect(spec.summary.impactedCount).toBe(0);
    expect(spec.summary.taskCount).toBe(0);
    expect(spec.summary.affectedModules).toEqual([]);
    expect(spec.changes).toEqual([]);
    expect(spec.impacts).toEqual([]);
    expect(spec.tasks).toEqual([]);
    expect(spec.slices).toBeDefined();
  });

  it('enriches changes with node metadata', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.task', kind: 'entity', name: 'task' },
      ]),
    ]);
    const plan = makePlan({
      changes: [{ nodeId: 'core.entity.task', changeKind: 'added' }],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.changes).toHaveLength(1);
    expect(spec.changes[0]!.nodeKind).toBe('entity');
    expect(spec.changes[0]!.module).toBe('core');
  });

  it('enriches impacts with node metadata', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.workflow.create', kind: 'workflow', name: 'create' },
      ]),
    ]);
    const plan = makePlan({
      impacts: [{ nodeId: 'core.workflow.create', reason: 'dep changed', via: 'writes', depth: 1 }],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.impacts).toHaveLength(1);
    expect(spec.impacts[0]!.nodeKind).toBe('workflow');
    expect(spec.impacts[0]!.module).toBe('core');
  });

  it('counts added/removed/modified correctly', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.a', kind: 'entity', name: 'a' },
        { id: 'core.entity.b', kind: 'entity', name: 'b' },
        { id: 'core.entity.c', kind: 'entity', name: 'c' },
      ]),
    ]);
    const plan = makePlan({
      changes: [
        { nodeId: 'core.entity.a', changeKind: 'added' },
        { nodeId: 'core.entity.b', changeKind: 'removed' },
        { nodeId: 'core.entity.c', changeKind: 'structurally_changed' },
      ],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.summary.addedCount).toBe(1);
    expect(spec.summary.removedCount).toBe(1);
    expect(spec.summary.modifiedCount).toBe(1);
  });

  it('collects affected modules', () => {
    const graph = makeGraph([
      makeModule('auth', [{ id: 'auth.entity.user', kind: 'entity', name: 'user' }]),
      makeModule('billing', [{ id: 'billing.entity.invoice', kind: 'entity', name: 'invoice' }]),
    ]);
    const plan = makePlan({
      changes: [
        { nodeId: 'auth.entity.user', changeKind: 'added' },
      ],
      impacts: [
        { nodeId: 'billing.entity.invoice', reason: 'cross-module', via: 'field_type', depth: 1 },
      ],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.summary.affectedModules).toEqual(['auth', 'billing']);
  });

  it('produces all 6 category slices', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan();
    const spec = buildIncrementalSpec(plan, graph);

    expect(Object.keys(spec.slices)).toEqual(
      expect.arrayContaining(['backend', 'frontend', 'api', 'runtime', 'schema', 'test']),
    );
  });

  it('handles unknown nodes gracefully', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan({
      changes: [{ nodeId: 'nonexistent.node', changeKind: 'added' }],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.changes[0]!.nodeKind).toBe('unknown');
    expect(spec.changes[0]!.module).toBe('');
  });

  it('handles unknown impact nodes gracefully', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan({
      impacts: [{ nodeId: 'nonexistent.node', reason: 'affected', via: 'references', depth: 1 }],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.impacts[0]!.nodeKind).toBe('unknown');
    expect(spec.impacts[0]!.module).toBe('');
  });

  it('counts tasks', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan({
      tasks: [
        { taskId: 't1', action: 'generate', nodeId: 'core.entity.a', reason: 'new' },
        { taskId: 't2', action: 'verify', nodeId: 'core.entity.b', reason: 'check' },
      ],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.summary.taskCount).toBe(2);
    expect(spec.tasks).toHaveLength(2);
  });

  it('counts all modification kinds', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan({
      changes: [
        { nodeId: 'a', changeKind: 'behaviorally_changed' },
        { nodeId: 'b', changeKind: 'policy_changed' },
        { nodeId: 'c', changeKind: 'renamed' },
      ],
    });

    const spec = buildIncrementalSpec(plan, graph);
    expect(spec.summary.modifiedCount).toBe(3);
  });
});

describe('serializeIncrementalSpec', () => {
  it('produces valid JSON', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const plan = makePlan();
    const spec = buildIncrementalSpec(plan, graph);
    const json = serializeIncrementalSpec(spec);
    const parsed = JSON.parse(json);

    expect(parsed.format).toBe('prodara-incremental-spec');
    expect(parsed.version).toBe('0.1.0');
  });

  it('round-trips correctly', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const plan = makePlan({
      changes: [{ nodeId: 'core.entity.item', changeKind: 'added' }],
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' }],
    });
    const spec = buildIncrementalSpec(plan, graph);
    const json = serializeIncrementalSpec(spec);
    const parsed = JSON.parse(json);

    expect(parsed.changes).toHaveLength(1);
    expect(parsed.changes[0].nodeKind).toBe('entity');
    expect(parsed.tasks).toHaveLength(1);
  });
});
