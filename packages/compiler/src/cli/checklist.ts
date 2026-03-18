// ---------------------------------------------------------------------------
// Prodara CLI — Quality Checklist Generation
// ---------------------------------------------------------------------------
// Generates a quality validation checklist from governance rules, graph
// analysis, and coverage checks.

import type { ProductGraph } from '../graph/graph-types.js';
import type { ResolvedConfig } from '../config/config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChecklistCategory = 'architecture' | 'security' | 'testing' | 'governance' | 'completeness' | 'quality';

export interface ChecklistItem {
  readonly id: string;
  readonly category: ChecklistCategory;
  readonly description: string;
  readonly source: string;
  readonly status: 'pending' | 'passed' | 'failed';
  readonly relatedNodes: readonly string[];
}

export interface Checklist {
  readonly format: 'prodara-checklist';
  readonly version: '0.1.0';
  readonly items: readonly ChecklistItem[];
  readonly summary: ChecklistSummary;
}

export interface ChecklistSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly pending: number;
  readonly byCategory: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function generateChecklist(graph: ProductGraph, config: ResolvedConfig): Checklist {
  const items: ChecklistItem[] = [];
  let counter = 1;

  const addItem = (category: ChecklistCategory, description: string, source: string, status: 'pending' | 'passed' | 'failed', relatedNodes: string[] = []) => {
    items.push({ id: `CK-${String(counter++).padStart(3, '0')}`, category, description, source, status, relatedNodes });
  };

  // --- Architecture checks ---
  // Check modules are listed in product block
  for (const mod of graph.modules) {
    const listed = graph.product.modules.includes(mod.name);
    addItem('architecture', `Module "${mod.name}" is listed in product declaration`, 'graph-analysis', listed ? 'passed' : 'failed', [mod.id]);
  }

  // Check for orphan entities (not referenced by any workflow/surface)
  const referencedEntityIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind === 'reads' || edge.kind === 'writes' || edge.kind === 'field_type' || edge.kind === 'refines_entity') {
      referencedEntityIds.add(edge.to);
    }
  }

  for (const mod of graph.modules) {
    const entities = (mod as Record<string, unknown>)['entities'] as Array<{ id: string; name: string }> | undefined;
    if (entities) {
      for (const entity of entities) {
        const referenced = referencedEntityIds.has(entity.id);
        addItem(
          'architecture',
          `Entity "${entity.name}" is referenced by at least one workflow or surface`,
          'coverage-analysis',
          referenced ? 'passed' : 'pending',
          [entity.id],
        );
      }
    }
  }

  // --- Security checks ---
  // Check workflows that modify data have authorization
  const authorizedWorkflowIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind === 'authorized_as' || edge.kind === 'governs') {
      authorizedWorkflowIds.add(edge.from);
    }
  }

  for (const mod of graph.modules) {
    const workflows = (mod as Record<string, unknown>)['workflows'] as Array<{ id: string; name: string }> | undefined;
    if (workflows) {
      for (const wf of workflows) {
        const hasAuth = authorizedWorkflowIds.has(wf.id);
        addItem('security', `Workflow "${wf.name}" has authorization rules`, 'security-reviewer', hasAuth ? 'passed' : 'pending', [wf.id]);
      }
    }
  }

  // --- Testing checks ---
  // Check for test coverage
  const testedNodeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind === 'tests') {
      testedNodeIds.add(edge.to);
    }
  }

  for (const mod of graph.modules) {
    const entities = (mod as Record<string, unknown>)['entities'] as Array<{ id: string; name: string }> | undefined;
    if (entities) {
      for (const entity of entities) {
        const tested = testedNodeIds.has(entity.id);
        addItem('testing', `Entity "${entity.name}" has test coverage`, 'test-analysis', tested ? 'passed' : 'pending', [entity.id]);
      }
    }
  }

  // --- Completeness checks ---
  // Check entity fields have id
  for (const mod of graph.modules) {
    const entities = (mod as Record<string, unknown>)['entities'] as Array<{ id: string; name: string; fields?: Array<{ name: string }> }> | undefined;
    if (entities) {
      for (const entity of entities) {
        const hasId = entity.fields?.some(f => f.name === 'id') ?? false;
        addItem('completeness', `Entity "${entity.name}" has an id field`, 'field-analysis', hasId ? 'passed' : 'pending', [entity.id]);
      }
    }
  }

  // --- Governance checks ---
  // Check reviewer configuration
  const enabledReviewers = Object.entries(config.reviewers).filter(([, v]) => v?.enabled);
  if (enabledReviewers.length > 0) {
    addItem('governance', `${enabledReviewers.length} reviewer(s) enabled in configuration`, 'config-analysis', 'passed', []);
  } else {
    addItem('governance', 'At least one reviewer should be enabled', 'config-analysis', 'pending', []);
  }

  // Check audit is enabled
  /* v8 ignore next -- audit enabled branch */
  addItem('governance', 'Audit trail is enabled', 'config-analysis', config.audit.enabled ? 'passed' : 'pending', []);

  // --- Quality checks ---
  // Check surface references
  for (const mod of graph.modules) {
    const surfaces = (mod as Record<string, unknown>)['surfaces'] as Array<{ id: string; name: string }> | undefined;
    if (surfaces) {
      for (const surface of surfaces) {
        const hasEdges = graph.edges.some(e => e.from === surface.id);
        /* v8 ignore next -- surface edge check ternary */
        addItem('quality', `Surface "${surface.name}" has defined relationships`, 'graph-analysis', hasEdges ? 'passed' : 'pending', [surface.id]);
      }
    }
  }

  // Build summary
  const byCategory: Record<string, number> = {};
  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  }

  return {
    format: 'prodara-checklist',
    version: '0.1.0',
    items,
    summary: {
      total: items.length,
      passed: items.filter(i => i.status === 'passed').length,
      failed: items.filter(i => i.status === 'failed').length,
      pending: items.filter(i => i.status === 'pending').length,
      byCategory,
    },
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatChecklistHuman(checklist: Checklist): string {
  const lines: string[] = [];

  lines.push(`Quality Checklist (${checklist.summary.total} items)`);
  lines.push(`  ✓ ${checklist.summary.passed} passed  ○ ${checklist.summary.pending} pending  ✗ ${checklist.summary.failed} failed`);
  lines.push('');

  // Group by category
  const grouped = new Map<string, ChecklistItem[]>();
  for (const item of checklist.items) {
    let group = grouped.get(item.category);
    if (!group) { group = []; grouped.set(item.category, group); }
    group.push(item);
  }

  for (const [category, items] of grouped) {
    lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push('');
    for (const item of items) {
      const icon = item.status === 'passed' ? '[x]' : item.status === 'failed' ? '[!]' : '[ ]';
      lines.push(`- ${icon} ${item.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
