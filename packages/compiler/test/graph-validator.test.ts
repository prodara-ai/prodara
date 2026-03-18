// ---------------------------------------------------------------------------
// Graph Validator tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { validateGraph } from '../src/graph/validator.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';

function makeGraph(
  modules: ModuleNode[],
  edges: { from: string; to: string; kind: string }[],
  productModules?: string[],
): ProductGraph {
  const modNames = productModules ?? modules.map((m) => m.name);
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product',
      kind: 'product',
      name: 'test',
      title: null,
      version: null,
      modules: modNames,
      publishes: null,
    },
    modules,
    edges: edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind as 'contains' })),
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };
}

function makeModule(name: string, items: { id: string; kind: string }[]): ModuleNode {
  const mod: Record<string, unknown> = { id: name, kind: 'module', name, imports: [] };
  for (const item of items) {
    const cat = item.kind + 's';
    if (!mod[cat]) mod[cat] = [];
    (mod[cat] as unknown[]).push(item);
  }
  return mod as unknown as ModuleNode;
}

describe('Graph Validator', () => {
  it('validates a correct graph with no errors', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.task', kind: 'entity' },
      { id: 'core.workflow.create', kind: 'workflow' },
    ]);
    const graph = makeGraph([mod], [
      { from: 'core.workflow.create', to: 'core.entity.task', kind: 'writes' },
    ]);

    const result = validateGraph(graph);
    expect(result.bag.hasErrors).toBe(false);
    expect(result.bag.all).toHaveLength(0);
  });

  it('reports error for missing product module reference', () => {
    const mod = makeModule('core', []);
    const graph = makeGraph([mod], [], ['core', 'nonexistent']);

    const result = validateGraph(graph);
    expect(result.bag.hasErrors).toBe(true);
    const diag = result.bag.all.find((d) => d.code === 'PRD0500');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('nonexistent');
  });

  it('warns on self-referencing edge', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.task', kind: 'entity' },
    ]);
    const graph = makeGraph([mod], [
      { from: 'core.entity.task', to: 'core.entity.task', kind: 'references' },
    ]);

    const result = validateGraph(graph);
    const selfRef = result.bag.all.find((d) => d.code === 'PRD0501');
    expect(selfRef).toBeDefined();
    expect(selfRef!.severity).toBe('warning');
  });

  it('reports error for edge with missing source node', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.task', kind: 'entity' },
    ]);
    const graph = makeGraph([mod], [
      { from: 'nonexistent.source', to: 'core.entity.task', kind: 'references' },
    ]);

    const result = validateGraph(graph);
    const diag = result.bag.all.find((d) => d.code === 'PRD0502');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('nonexistent.source');
  });

  it('reports warning for edge with missing target node', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.task', kind: 'entity' },
    ]);
    const graph = makeGraph([mod], [
      { from: 'core.entity.task', to: 'nonexistent.target', kind: 'references' },
    ]);

    const result = validateGraph(graph);
    const diag = result.bag.all.find((d) => d.code === 'PRD0503');
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('warning');
    expect(diag!.message).toContain('nonexistent.target');
  });

  it('validates product node ID is always valid', () => {
    const mod = makeModule('core', []);
    const graph = makeGraph([mod], [
      { from: 'product', to: 'core', kind: 'contains' },
    ]);

    const result = validateGraph(graph);
    expect(result.bag.hasErrors).toBe(false);
  });

  it('handles empty graph with no modules or edges', () => {
    const graph = makeGraph([], []);
    const result = validateGraph(graph);
    expect(result.bag.hasErrors).toBe(false);
    expect(result.bag.all).toHaveLength(0);
  });

  it('reports multiple errors at once', () => {
    const mod = makeModule('core', []);
    const graph = makeGraph([mod], [
      { from: 'missing1', to: 'missing2', kind: 'references' },
    ], ['core', 'ghost_module']);

    const result = validateGraph(graph);
    // PRD0500 for ghost_module, PRD0502 for missing1, PRD0503 for missing2
    expect(result.bag.all.length).toBeGreaterThanOrEqual(3);
  });
});
