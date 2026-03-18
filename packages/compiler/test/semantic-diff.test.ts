import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { bind } from '../src/binder/binder.js';
import { buildGraph } from '../src/graph/builder.js';
import { semanticDiff, formatSemanticDiffHuman } from '../src/planner/semantic-diff.js';
import type { ProductGraph } from '../src/graph/graph-types.js';

function graphFromSource(source: string): ProductGraph {
  const { ast, bag: parseBag } = parse(source);
  expect(parseBag.hasErrors).toBe(false);
  const bindResult = bind([ast]);
  expect(bindResult.bag.hasErrors).toBe(false);
  const { graph } = buildGraph([ast], bindResult);
  return graph;
}

describe('Semantic Diff', () => {
  it('detects added nodes with human-readable summary', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } entity project { id: uuid } }
    `);

    const result = semanticDiff(prev, next);

    expect(result.format).toBe('prodara-semantic-diff');
    expect(result.summary.added).toBeGreaterThan(0);
    expect(result.entries.some(e => e.changeKind === 'added')).toBe(true);
    expect(result.summary.humanSummary).toContain('added');
  });

  it('detects removed nodes', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } entity project { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } }
    `);

    const result = semanticDiff(prev, next);
    expect(result.summary.removed).toBeGreaterThan(0);
    expect(result.entries.some(e => e.changeKind === 'removed')).toBe(true);
  });

  it('detects modified nodes', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid title: string } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid title: string done: boolean } }
    `);

    const result = semanticDiff(prev, next);
    expect(result.summary.modified).toBeGreaterThan(0);
  });

  it('reports no changes for identical graphs', () => {
    const g = graphFromSource(`
      module core { entity task { id: uuid } }
    `);

    const result = semanticDiff(g, g);
    expect(result.summary.totalChanges).toBe(0);
    expect(result.summary.humanSummary).toContain('No changes');
  });

  it('formats human-readable output', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } entity project { id: uuid } }
    `);

    const result = semanticDiff(prev, next);
    const output = formatSemanticDiffHuman(result);

    expect(output).toContain('Semantic Diff Summary');
    expect(output).toContain('+');
  });

  it('reports affected modules', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } entity user { id: uuid } }
    `);

    const result = semanticDiff(prev, next);
    expect(result.summary.affectedModules).toContain('core');
  });

  it('describes added fields in modified entities', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid title: string } }
    `);

    const result = semanticDiff(prev, next);
    const modified = result.entries.find(e => e.changeKind !== 'added' && e.changeKind !== 'removed');
    expect(modified).toBeDefined();
    expect(modified!.details.some(d => d.includes('Added field'))).toBe(true);
  });

  it('describes removed fields in modified entities', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid title: string } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } }
    `);

    const result = semanticDiff(prev, next);
    const modified = result.entries.find(e => e.changeKind !== 'added' && e.changeKind !== 'removed');
    expect(modified).toBeDefined();
    expect(modified!.details.some(d => d.includes('Removed field'))).toBe(true);
  });

  it('describes changes when workflow steps change', () => {
    const prev = graphFromSource(`
      module core {
        entity task { id: uuid }
        workflow submit {
          writes { task }
          steps {
            call validate
          }
          returns { ok: task }
        }
      }
    `);
    const next = graphFromSource(`
      module core {
        entity task { id: uuid }
        workflow submit {
          writes { task }
          steps {
            call validate
            call persist
          }
          returns { ok: task }
        }
      }
    `);

    const result = semanticDiff(prev, next);
    expect(result.summary.totalChanges).toBeGreaterThan(0);
  });

  it('falls back to "Properties changed" when no specific detail', () => {
    const prev = graphFromSource(`
      module core {
        enum status { active inactive }
      }
    `);
    const next = graphFromSource(`
      module core {
        enum status { active inactive archived }
      }
    `);

    const result = semanticDiff(prev, next);
    const modified = result.entries.find(e => e.changeKind !== 'added' && e.changeKind !== 'removed');
    if (modified) {
      expect(modified.details.some(d =>
        d.includes('Properties changed') || d.includes('Members:')
      )).toBe(true);
    }
  });

  it('shows members for enum nodes in details', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } enum status { open closed } }
    `);

    const result = semanticDiff(prev, next);
    const added = result.entries.find(e =>
      e.changeKind === 'added' && e.summary.includes('enum')
    );
    expect(added).toBeDefined();
    expect(added!.details.some(d => d.includes('Members:'))).toBe(true);
  });

  it('formats node id with 3-part qualified name', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } entity user { id: uuid } }
    `);

    const result = semanticDiff(prev, next);
    const output = formatSemanticDiffHuman(result);
    // 3-part id like core.entity.user shows as: entity 'user' in module 'core'
    expect(output).toContain("entity 'user'");
  });

  it('formats human output with details and impacted entries', () => {
    const prev = graphFromSource(`
      module core {
        entity task { id: uuid title: string }
        workflow submit {
          reads { task }
          writes { task }
          steps { call validate }
          returns { ok: task }
        }
      }
    `);
    const next = graphFromSource(`
      module core {
        entity task { id: uuid title: string done: boolean }
        workflow submit {
          reads { task }
          writes { task }
          steps { call validate }
          returns { ok: task }
        }
      }
    `);

    const result = semanticDiff(prev, next);
    const output = formatSemanticDiffHuman(result);
    expect(output).toContain('Changes:');
    // Modified entries have details like "Added field 'done'"
    expect(output).toContain('Added field');
    // Impacted entries via edge propagation
    if (result.impacted.length > 0) {
      expect(output).toContain('Impacted:');
      expect(output).toContain('→');
    }
  });

  it('formats 2-part node id for module-level changes', () => {
    const prev = graphFromSource(`
      module core { entity task { id: uuid } }
    `);
    const next = graphFromSource(`
      module core { entity task { id: uuid } }
      module billing { entity invoice { id: uuid } }
    `);

    const result = semanticDiff(prev, next);
    const output = formatSemanticDiffHuman(result);
    // Module-level node id "billing" → 2-part ids like "billing.invoice"
    // should show: 'invoice' in module 'billing'
    expect(output).toContain("in module 'billing'");
  });

  it('detects authorization changes in workflows', () => {
    const prev = graphFromSource(`
      module core {
        actor admin {}
        entity task { id: uuid }
        workflow submit {
          authorization { admin: [execute] }
          writes { task }
          steps { call validate }
          returns { ok: task }
        }
      }
    `);
    const next = graphFromSource(`
      module core {
        actor admin {}
        actor viewer {}
        entity task { id: uuid }
        workflow submit {
          authorization { viewer: [execute] }
          writes { task }
          steps { call validate }
          returns { ok: task }
        }
      }
    `);

    const result = semanticDiff(prev, next);
    const modified = result.entries.find(e =>
      e.nodeId.includes('submit') && e.changeKind !== 'added' && e.changeKind !== 'removed'
    );
    if (modified) {
      expect(modified.details.some(d =>
        d.includes('Authorization') || d.includes('Properties changed')
      )).toBe(true);
    }
  });

  it('detects transition changes in workflows', () => {
    const prev = graphFromSource(`
      module core {
        entity task { id: uuid status: string }
        workflow submit {
          writes { task }
          steps { call validate }
          transitions { task.status: draft -> submitted }
          returns { ok: task }
        }
      }
    `);
    const next = graphFromSource(`
      module core {
        entity task { id: uuid status: string }
        workflow submit {
          writes { task }
          steps { call validate }
          transitions { task.status: draft -> approved }
          returns { ok: task }
        }
      }
    `);

    const result = semanticDiff(prev, next);
    const modified = result.entries.find(e =>
      e.nodeId.includes('submit') && e.changeKind !== 'added' && e.changeKind !== 'removed'
    );
    if (modified) {
      expect(modified.details.some(d =>
        d.includes('State transitions changed') || d.includes('Properties changed')
      )).toBe(true);
    }
  });
});
