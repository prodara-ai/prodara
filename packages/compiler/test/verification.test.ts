// ---------------------------------------------------------------------------
// Verification module tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { verify } from '../src/verification/verify.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';
import type { IncrementalSpec } from '../src/incremental/types.js';
import type { WorkflowResult } from '../src/workflow/engine.js';
import type { ReviewCycleResult } from '../src/reviewers/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGraph(
  modules: ModuleNode[],
  edges: { from: string; to: string; kind: string }[] = [],
  productModules?: string[],
): ProductGraph {
  const modIds = productModules ?? modules.map((m) => m.id);
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product', kind: 'product', name: 'test', title: null, version: null,
      modules: modIds, publishes: null,
    },
    modules,
    edges: edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind as 'contains' })),
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };
}

function makeModule(name: string, items: { id: string; kind: string; name: string }[] = []): ModuleNode {
  const mod: Record<string, unknown> = { id: name, kind: 'module', name, imports: [] };
  for (const item of items) {
    const cat = item.kind + 's';
    if (!mod[cat]) mod[cat] = [];
    (mod[cat] as unknown[]).push(item);
  }
  return mod as unknown as ModuleNode;
}

function makeSpec(overrides: Partial<IncrementalSpec> = {}): IncrementalSpec {
  return {
    format: 'prodara-incremental-spec',
    version: '0.1.0',
    summary: { addedCount: 0, removedCount: 0, modifiedCount: 0, impactedCount: 0, taskCount: 0, affectedModules: [] },
    changes: [],
    impacts: [],
    tasks: [],
    slices: {} as IncrementalSpec['slices'],
    ...overrides,
  };
}

function makeWorkflow(ok: boolean, phaseCount: number = 6): WorkflowResult {
  return {
    ok,
    phases: Array.from({ length: phaseCount }, (_, i) => ({
      phase: 'specify' as const,
      ok,
      data: {},
      warnings: [],
    })),
  };
}

function makeAcceptedCycle(): ReviewCycleResult {
  return {
    iteration: 1,
    results: [],
    accepted: true,
    totalFindings: 0,
    criticalCount: 0,
    errorCount: 0,
    warningCount: 0,
    fixAttempt: null,
  };
}

function makeFailedCycle(): ReviewCycleResult {
  return {
    iteration: 1,
    results: [],
    accepted: false,
    totalFindings: 2,
    criticalCount: 1,
    errorCount: 1,
    warningCount: 0,
    fixAttempt: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('verify', () => {
  it('passes a clean graph with accepted review', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);

    expect(result.passed).toBe(true);
    expect(result.failCount).toBe(0);
    expect(result.passCount).toBeGreaterThan(0);
  });

  it('fails when graph has orphan edges', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [{ from: 'nonexistent', to: 'core', kind: 'contains' }],
    );
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'graph_edges_valid' && c.severity === 'fail')).toBe(true);
  });

  it('passes when all edges are valid', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [{ from: 'core', to: 'core.entity.item', kind: 'contains' }],
    );
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'graph_edges_valid' && c.severity === 'pass')).toBe(true);
  });

  it('fails when product references missing modules', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [],
      ['core', 'missing'],
    );
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'modules_consistent' && c.severity === 'fail')).toBe(true);
  });

  it('warns when modules are unlisted in product', () => {
    const graph = makeGraph(
      [makeModule('core', []), makeModule('extra', [])],
      [],
      ['core'], // extra is unlisted
    );
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'modules_consistent' && c.severity === 'warn')).toBe(true);
  });

  it('reports tasks summary', () => {
    const spec = makeSpec({
      tasks: [
        { taskId: 't1', action: 'generate', nodeId: 'a', reason: 'new' },
        { taskId: 't2', action: 'remove', nodeId: 'b', reason: 'gone' },
      ],
    });
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, spec, makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'tasks_present' && c.severity === 'pass')).toBe(true);
  });

  it('passes with empty tasks (clean state)', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'tasks_present' && c.severity === 'pass')).toBe(true);
  });

  it('fails when workflow did not complete', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(false), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'workflow_phases' && c.severity === 'fail')).toBe(true);
  });

  it('passes when workflow completed', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'workflow_phases' && c.severity === 'pass')).toBe(true);
  });

  it('fails when review was not accepted', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeFailedCycle()]);
    expect(result.checks.some((c) => c.name === 'review_acceptance' && c.severity === 'fail')).toBe(true);
  });

  it('warns when no review cycles were run', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), []);
    expect(result.checks.some((c) => c.name === 'review_acceptance' && c.severity === 'warn')).toBe(true);
  });

  it('warns when no constitutions are defined', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'constitution_present' && c.severity === 'warn')).toBe(true);
  });

  it('passes when constitutions are present', () => {
    const graph = makeGraph([
      makeModule('gov', [{ id: 'gov.constitution.rules', kind: 'constitution', name: 'rules' }]),
    ]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);
    expect(result.checks.some((c) => c.name === 'constitution_present' && c.severity === 'pass')).toBe(true);
  });

  it('counts pass/fail/warn correctly', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = verify(graph, makeSpec(), makeWorkflow(true), [makeAcceptedCycle()]);

    expect(result.passCount + result.failCount + result.warnCount).toBe(result.checks.length);
  });
});
