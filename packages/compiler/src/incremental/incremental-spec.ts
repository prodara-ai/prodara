// ---------------------------------------------------------------------------
// Prodara Compiler — Incremental Spec Builder
// ---------------------------------------------------------------------------
// Builds the IncrementalSpec artifact from a Plan and the current ProductGraph.
// This enriches the raw plan data with node-level details and graph slices
// so that downstream workflow phases have everything they need.

import type { Plan } from '../planner/plan-types.js';
import type { ProductGraph } from '../graph/graph-types.js';
import type { SliceCategory } from '../generator/contracts.js';
import { sliceGraph } from '../generator/contracts.js';
import type {
  IncrementalSpec,
  IncrementalSpecSummary,
  NodeChangeDetail,
  ImpactDetail,
} from './types.js';

// ---------------------------------------------------------------------------
// Node metadata lookup
// ---------------------------------------------------------------------------

interface NodeMeta {
  readonly kind: string;
  readonly module: string;
}

function buildNodeMetaMap(graph: ProductGraph): Map<string, NodeMeta> {
  const map = new Map<string, NodeMeta>();
  map.set('product', { kind: 'product', module: '' });

  for (const mod of graph.modules) {
    map.set(mod.id, { kind: 'module', module: mod.name });
    for (const [key, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item && 'kind' in item) {
            const typed = item as { id: string; kind: string };
            map.set(typed.id, { kind: typed.kind, module: mod.name });
          }
        }
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

const MODIFIED_KINDS = new Set([
  'structurally_changed',
  'behaviorally_changed',
  'policy_changed',
  'renamed',
]);

/**
 * Build a full IncrementalSpec artifact from the plan and current graph.
 */
export function buildIncrementalSpec(
  plan: Plan,
  graph: ProductGraph,
): IncrementalSpec {
  const meta = buildNodeMetaMap(graph);

  // Enrich changes
  const changes: NodeChangeDetail[] = plan.changes.map((c) => {
    const m = meta.get(c.nodeId);
    return {
      ...c,
      nodeKind: m?.kind ?? 'unknown',
      module: m?.module ?? '',
    };
  });

  // Enrich impacts
  const impacts: ImpactDetail[] = plan.impacts.map((i) => {
    const m = meta.get(i.nodeId);
    return {
      ...i,
      nodeKind: m?.kind ?? 'unknown',
      module: m?.module ?? '',
    };
  });

  // Collect affected modules
  const moduleSet = new Set<string>();
  for (const c of changes) {
    if (c.module) moduleSet.add(c.module);
  }
  for (const i of impacts) {
    if (i.module) moduleSet.add(i.module);
  }
  const affectedModules = [...moduleSet].sort();

  // Build summary
  const summary: IncrementalSpecSummary = {
    addedCount: changes.filter((c) => c.changeKind === 'added').length,
    removedCount: changes.filter((c) => c.changeKind === 'removed').length,
    modifiedCount: changes.filter((c) => MODIFIED_KINDS.has(c.changeKind)).length,
    impactedCount: impacts.length,
    taskCount: plan.tasks.length,
    affectedModules,
  };

  // Produce all category slices
  const categories: SliceCategory[] = ['backend', 'frontend', 'api', 'runtime', 'schema', 'test'];
  const slices = {} as Record<SliceCategory, ReturnType<typeof sliceGraph>>;
  for (const cat of categories) {
    slices[cat] = sliceGraph(graph, cat);
  }

  return {
    format: 'prodara-incremental-spec',
    version: '0.1.0',
    summary,
    changes,
    impacts,
    tasks: plan.tasks,
    slices,
  };
}

/**
 * Serialize an IncrementalSpec to deterministic JSON.
 */
export function serializeIncrementalSpec(spec: IncrementalSpec): string {
  return JSON.stringify(spec, null, 2);
}
