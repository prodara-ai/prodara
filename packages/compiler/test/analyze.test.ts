// ---------------------------------------------------------------------------
// Tests — Cross-Artifact Analysis
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  analyzeGraph,
  formatAnalysisHuman,
  type AnalysisOptions,
} from '../src/cli/analyze.js';
import type { ProductGraph, ModuleNode, GraphEdge } from '../src/graph/graph-types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: AnalysisOptions = { couplingThreshold: 5 };

function makeGraph(overrides: Partial<ProductGraph> = {}): ProductGraph {
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product',
      kind: 'product',
      name: 'test',
      title: 'Test Product',
      version: '0.1.0',
      modules: ['core'],
      publishes: null,
    },
    modules: [],
    edges: [],
    metadata: { compiler: '0.0.0', compiled_at: new Date().toISOString(), source_files: ['test.prd'] },
    ...overrides,
  };
}

function makeModule(name: string, extras: Record<string, unknown> = {}): ModuleNode {
  return {
    id: `module:${name}`,
    kind: 'module',
    name,
    imports: [],
    ...extras,
  } as ModuleNode;
}

function makeEdge(from: string, to: string, kind: GraphEdge['kind']): GraphEdge {
  return { from, to, kind };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzeGraph', () => {
  it('returns clean analysis for empty graph', () => {
    const result = analyzeGraph(makeGraph(), DEFAULT_OPTIONS);
    expect(result.format).toBe('prodara-analysis');
    expect(result.version).toBe('0.1.0');
    expect(result.consistency).toHaveLength(0);
    expect(result.coverage.entitiesTotal).toBe(0);
    expect(result.coverage.workflowsTotal).toBe(0);
    expect(result.coverage.surfacesTotal).toBe(0);
  });

  it('detects orphan nodes', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:Ghost', kind: 'entity', name: 'Ghost' }],
        }),
      ],
      edges: [],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const orphans = result.consistency.filter(c => c.kind === 'orphan_node');
    expect(orphans.length).toBeGreaterThanOrEqual(1);
    expect(orphans.some(o => o.nodeIds.includes('entity:Ghost'))).toBe(true);
  });

  it('does not flag nodes with edges as orphans', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:User', kind: 'entity', name: 'User' }],
        }),
      ],
      edges: [makeEdge('workflow:Register', 'entity:User', 'writes')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const orphans = result.consistency.filter(c => c.kind === 'orphan_node');
    expect(orphans.every(o => !o.nodeIds.includes('entity:User'))).toBe(true);
  });

  it('detects missing test coverage', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:Task', kind: 'entity', name: 'Task' }],
        }),
      ],
      edges: [makeEdge('module:core', 'entity:Task', 'contains')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const missing = result.consistency.filter(c => c.kind === 'missing_test_coverage');
    expect(missing.some(m => m.nodeIds.includes('entity:Task'))).toBe(true);
    expect(result.coverage.entitiesWithTests).toBe(0);
    expect(result.coverage.entitiesTotal).toBe(1);
  });

  it('does not flag tested entities', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:Task', kind: 'entity', name: 'Task' }],
        }),
      ],
      edges: [makeEdge('test:TaskTest', 'entity:Task', 'tests')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const missing = result.consistency.filter(c => c.kind === 'missing_test_coverage');
    expect(missing.every(m => !m.nodeIds.includes('entity:Task'))).toBe(true);
    expect(result.coverage.entitiesWithTests).toBe(1);
  });

  it('detects missing authorization', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          workflows: [{ id: 'workflow:Pay', kind: 'workflow', name: 'Pay' }],
        }),
      ],
      edges: [makeEdge('module:core', 'workflow:Pay', 'contains')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const missing = result.consistency.filter(c => c.kind === 'missing_authorization');
    expect(missing.some(m => m.nodeIds.includes('workflow:Pay'))).toBe(true);
    expect(result.coverage.workflowsWithAuth).toBe(0);
  });

  it('does not flag authorized workflows', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          workflows: [{ id: 'workflow:Pay', kind: 'workflow', name: 'Pay' }],
        }),
      ],
      edges: [makeEdge('workflow:Pay', 'role:Admin', 'authorized_as')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const missing = result.consistency.filter(c => c.kind === 'missing_authorization');
    expect(missing.every(m => !m.nodeIds.includes('workflow:Pay'))).toBe(true);
    expect(result.coverage.workflowsWithAuth).toBe(1);
  });

  it('detects unused events', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          events: [{ id: 'event:OrderPlaced', kind: 'event', name: 'OrderPlaced' }],
        }),
      ],
      edges: [makeEdge('module:core', 'event:OrderPlaced', 'contains')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const unused = result.consistency.filter(c => c.kind === 'unused_event');
    expect(unused.some(u => u.nodeIds.includes('event:OrderPlaced'))).toBe(true);
  });

  it('does not flag consumed events', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          events: [{ id: 'event:OrderPlaced', kind: 'event', name: 'OrderPlaced' }],
        }),
      ],
      edges: [makeEdge('workflow:Fulfill', 'event:OrderPlaced', 'consumes_event')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const unused = result.consistency.filter(c => c.kind === 'unused_event');
    expect(unused.every(u => !u.nodeIds.includes('event:OrderPlaced'))).toBe(true);
  });

  it('detects cross-module coupling above threshold', () => {
    const edges: GraphEdge[] = [];
    // Create > threshold edges between modules
    for (let i = 0; i < 8; i++) {
      edges.push(makeEdge(`entity:A${i}`, `entity:B${i}`, 'field_type'));
    }
    // Map them to different modules
    const modA = makeModule('modA', {
      entities: Array.from({ length: 8 }, (_, i) => ({ id: `entity:A${i}`, kind: 'entity', name: `A${i}` })),
    });
    const modB = makeModule('modB', {
      entities: Array.from({ length: 8 }, (_, i) => ({ id: `entity:B${i}`, kind: 'entity', name: `B${i}` })),
    });
    const graph = makeGraph({ modules: [modA, modB], edges });
    const result = analyzeGraph(graph, { couplingThreshold: 3 });
    const coupling = result.consistency.filter(c => c.kind === 'cross_module_coupling');
    expect(coupling.length).toBeGreaterThanOrEqual(1);
    expect(coupling[0]!.message).toContain('modA');
    expect(coupling[0]!.message).toContain('modB');
  });

  it('respects coupling threshold', () => {
    const edges: GraphEdge[] = [];
    for (let i = 0; i < 3; i++) {
      edges.push(makeEdge(`entity:A${i}`, `entity:B${i}`, 'field_type'));
    }
    const modA = makeModule('modA', {
      entities: Array.from({ length: 3 }, (_, i) => ({ id: `entity:A${i}`, kind: 'entity', name: `A${i}` })),
    });
    const modB = makeModule('modB', {
      entities: Array.from({ length: 3 }, (_, i) => ({ id: `entity:B${i}`, kind: 'entity', name: `B${i}` })),
    });
    const graph = makeGraph({ modules: [modA, modB], edges });
    // Threshold > count → no warning
    const result = analyzeGraph(graph, { couplingThreshold: 5 });
    const coupling = result.consistency.filter(c => c.kind === 'cross_module_coupling');
    expect(coupling).toHaveLength(0);
  });

  it('detects incomplete surfaces', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          surfaces: [{ id: 'surface:Dash', kind: 'surface', name: 'Dash' }],
        }),
      ],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const incomplete = result.consistency.filter(c => c.kind === 'surface_incomplete');
    expect(incomplete.some(s => s.nodeIds.includes('surface:Dash'))).toBe(true);
    expect(result.coverage.surfacesWithEdges).toBe(0);
    expect(result.coverage.surfacesTotal).toBe(1);
  });

  it('does not flag surfaces with outbound edges', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          surfaces: [{ id: 'surface:Dash', kind: 'surface', name: 'Dash' }],
        }),
      ],
      edges: [makeEdge('surface:Dash', 'entity:Task', 'reads')],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const incomplete = result.consistency.filter(c => c.kind === 'surface_incomplete');
    expect(incomplete.every(s => !s.nodeIds.includes('surface:Dash'))).toBe(true);
    expect(result.coverage.surfacesWithEdges).toBe(1);
  });
});

describe('formatAnalysisHuman', () => {
  it('includes coverage header', () => {
    const result = analyzeGraph(makeGraph(), DEFAULT_OPTIONS);
    const output = formatAnalysisHuman(result);
    expect(output).toContain('Cross-Artifact Analysis');
    expect(output).toContain('## Coverage');
    expect(output).toContain('Entities with tests');
    expect(output).toContain('Workflows with auth');
    expect(output).toContain('Surfaces with edges');
  });

  it('shows no issues message for clean graph', () => {
    const result = analyzeGraph(makeGraph(), DEFAULT_OPTIONS);
    const output = formatAnalysisHuman(result);
    expect(output).toContain('No consistency issues found');
  });

  it('shows findings with severity icons', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:X', kind: 'entity', name: 'X' }],
          workflows: [{ id: 'workflow:W', kind: 'workflow', name: 'W' }],
        }),
      ],
    });
    const result = analyzeGraph(graph, DEFAULT_OPTIONS);
    const output = formatAnalysisHuman(result);
    expect(output).toContain('## Findings');
    // Should contain warning (⚠) or info (ℹ) icons
    expect(output).toMatch(/[⚠ℹ]/);
  });
});
