// ---------------------------------------------------------------------------
// Tests — Quality Checklist Generation
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  generateChecklist,
  formatChecklistHuman,
  type Checklist,
  type ChecklistCategory,
} from '../src/cli/checklist.js';
import type { ProductGraph, ModuleNode, GraphEdge } from '../src/graph/graph-types.js';
import { DEFAULT_CONFIG } from '../src/config/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

describe('generateChecklist', () => {
  it('returns empty checklist for empty graph', () => {
    const graph = makeGraph();
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    expect(checklist.format).toBe('prodara-checklist');
    expect(checklist.version).toBe('0.1.0');
    // Should still have governance checks (reviewer + audit)
    expect(checklist.items.length).toBeGreaterThanOrEqual(2);
    expect(checklist.summary.total).toBe(checklist.items.length);
  });

  it('marks module listed in product as passed', () => {
    const graph = makeGraph({
      modules: [makeModule('core')],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const moduleItem = checklist.items.find(i => i.description.includes('Module "core" is listed'));
    expect(moduleItem).toBeDefined();
    expect(moduleItem!.status).toBe('passed');
    expect(moduleItem!.category).toBe('architecture');
  });

  it('marks unlisted module as failed', () => {
    const graph = makeGraph({
      product: {
        id: 'product',
        kind: 'product',
        name: 'test',
        title: null,
        version: null,
        modules: [],
        publishes: null,
      },
      modules: [makeModule('core')],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const moduleItem = checklist.items.find(i => i.description.includes('Module "core" is listed'));
    expect(moduleItem).toBeDefined();
    expect(moduleItem!.status).toBe('failed');
  });

  it('checks orphan entities', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:User', kind: 'entity', name: 'User' }],
        }),
      ],
    });
    // No edges referencing entity → pending
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const entityItem = checklist.items.find(i => i.description.includes('Entity "User" is referenced'));
    expect(entityItem).toBeDefined();
    expect(entityItem!.status).toBe('pending');
  });

  it('marks referenced entity as passed', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:User', kind: 'entity', name: 'User' }],
        }),
      ],
      edges: [makeEdge('workflow:Register', 'entity:User', 'writes')],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const entityItem = checklist.items.find(i => i.description.includes('Entity "User" is referenced'));
    expect(entityItem!.status).toBe('passed');
  });

  it('checks workflow authorization', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          workflows: [{ id: 'workflow:Pay', kind: 'workflow', name: 'Pay' }],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const secItem = checklist.items.find(i => i.description.includes('Workflow "Pay" has authorization'));
    expect(secItem).toBeDefined();
    expect(secItem!.category).toBe('security');
    expect(secItem!.status).toBe('pending');
  });

  it('marks authorized workflow as passed', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          workflows: [{ id: 'workflow:Pay', kind: 'workflow', name: 'Pay' }],
        }),
      ],
      edges: [makeEdge('workflow:Pay', 'role:Admin', 'authorized_as')],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const secItem = checklist.items.find(i => i.description.includes('Workflow "Pay"'));
    expect(secItem!.status).toBe('passed');
  });

  it('checks entity test coverage', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:Task', kind: 'entity', name: 'Task' }],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const testItem = checklist.items.find(i => i.description.includes('Entity "Task" has test coverage'));
    expect(testItem!.status).toBe('pending');
  });

  it('marks tested entity as passed', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:Task', kind: 'entity', name: 'Task' }],
        }),
      ],
      edges: [makeEdge('test:TaskTest', 'entity:Task', 'tests')],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const testItem = checklist.items.find(i => i.description.includes('Entity "Task" has test coverage'));
    expect(testItem!.status).toBe('passed');
  });

  it('checks entity id field completeness', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [
            { id: 'entity:A', kind: 'entity', name: 'A', fields: [{ name: 'id' }, { name: 'title' }] },
            { id: 'entity:B', kind: 'entity', name: 'B', fields: [{ name: 'title' }] },
          ],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const aItem = checklist.items.find(i => i.description.includes('Entity "A" has an id field'));
    const bItem = checklist.items.find(i => i.description.includes('Entity "B" has an id field'));
    expect(aItem!.status).toBe('passed');
    expect(bItem!.status).toBe('pending');
  });

  it('checks governance — reviewer config', () => {
    const checklist = generateChecklist(makeGraph(), DEFAULT_CONFIG);
    const govItem = checklist.items.find(i => i.description.includes('reviewer'));
    expect(govItem).toBeDefined();
    expect(govItem!.category).toBe('governance');
    // DEFAULT_CONFIG has reviewers enabled
    expect(govItem!.status).toBe('passed');
  });

  it('marks governance pending when no reviewers enabled', () => {
    const noReviewerConfig = {
      ...DEFAULT_CONFIG,
      reviewers: Object.fromEntries(
        Object.entries(DEFAULT_CONFIG.reviewers).map(([k, v]) => [k, { ...v, enabled: false }]),
      ) as typeof DEFAULT_CONFIG.reviewers,
    };
    const checklist = generateChecklist(makeGraph(), noReviewerConfig);
    const govItem = checklist.items.find(i => i.description.includes('reviewer'));
    expect(govItem!.status).toBe('pending');
  });

  it('checks governance — audit enabled', () => {
    const checklist = generateChecklist(makeGraph(), DEFAULT_CONFIG);
    const auditItem = checklist.items.find(i => i.description.includes('Audit trail'));
    expect(auditItem!.status).toBe('passed');
  });

  it('checks surface relationships', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          surfaces: [{ id: 'surface:Dashboard', kind: 'surface', name: 'Dashboard' }],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const surfItem = checklist.items.find(i => i.description.includes('Surface "Dashboard"'));
    expect(surfItem).toBeDefined();
    expect(surfItem!.status).toBe('pending');
  });

  it('summary counts are accurate', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:X', kind: 'entity', name: 'X' }],
          workflows: [{ id: 'workflow:Y', kind: 'workflow', name: 'Y' }],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const { summary } = checklist;
    expect(summary.total).toBe(summary.passed + summary.failed + summary.pending);
    expect(Object.values(summary.byCategory).reduce((a, b) => a + b, 0)).toBe(summary.total);
  });

  it('assigns sequential IDs', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [
            { id: 'entity:A', kind: 'entity', name: 'A' },
            { id: 'entity:B', kind: 'entity', name: 'B' },
          ],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const ids = checklist.items.map(i => i.id);
    expect(ids[0]).toBe('CK-001');
    expect(ids[1]).toBe('CK-002');
  });
});

describe('formatChecklistHuman', () => {
  it('includes header with counts', () => {
    const checklist = generateChecklist(makeGraph(), DEFAULT_CONFIG);
    const output = formatChecklistHuman(checklist);
    expect(output).toContain('Quality Checklist');
    expect(output).toContain('passed');
    expect(output).toContain('pending');
    expect(output).toContain('failed');
  });

  it('groups items by category', () => {
    const graph = makeGraph({
      modules: [
        makeModule('core', {
          entities: [{ id: 'entity:E', kind: 'entity', name: 'E' }],
          workflows: [{ id: 'workflow:W', kind: 'workflow', name: 'W' }],
          surfaces: [{ id: 'surface:S', kind: 'surface', name: 'S' }],
        }),
      ],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const output = formatChecklistHuman(checklist);
    expect(output).toContain('## Architecture');
    expect(output).toContain('## Security');
    expect(output).toContain('## Testing');
    expect(output).toContain('## Governance');
    expect(output).toContain('## Quality');
  });

  it('uses correct status icons', () => {
    const graph = makeGraph({
      product: {
        id: 'product',
        kind: 'product',
        name: 'test',
        title: null,
        version: null,
        modules: [],
        publishes: null,
      },
      modules: [makeModule('core')],
    });
    const checklist = generateChecklist(graph, DEFAULT_CONFIG);
    const output = formatChecklistHuman(checklist);
    // Module "core" not in product.modules → failed → [!]
    expect(output).toContain('[!]');
  });
});
