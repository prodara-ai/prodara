// ---------------------------------------------------------------------------
// Prodara Compiler — Graph Differ
// ---------------------------------------------------------------------------
// Compares two product graphs and emits NodeChange entries.

import type { ProductGraph, GraphEdge } from '../graph/graph-types.js';
import type { NodeChange, ChangeKind } from './plan-types.js';

export function diffGraphs(prev: ProductGraph, next: ProductGraph): NodeChange[] {
  const changes: NodeChange[] = [];

  const prevNodes = collectNodeIds(prev);
  const nextNodes = collectNodeIds(next);

  // Added nodes
  for (const id of nextNodes) {
    if (!prevNodes.has(id)) {
      changes.push({ nodeId: id, changeKind: 'added' });
    }
  }

  // Removed nodes
  for (const id of prevNodes) {
    if (!nextNodes.has(id)) {
      changes.push({ nodeId: id, changeKind: 'removed' });
    }
  }

  // Changed nodes — compare JSON-serialized node content
  const prevNodeMap = buildNodeContentMap(prev);
  const nextNodeMap = buildNodeContentMap(next);

  for (const id of nextNodes) {
    if (!prevNodes.has(id)) continue; // already handled as added
    const prevContent = prevNodeMap.get(id);
    const nextContent = nextNodeMap.get(id);
    if (prevContent !== nextContent) {
      const kind = classifyChange(id, prev, next);
      changes.push({ nodeId: id, changeKind: kind });
    }
  }

  return changes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

function collectNodeIds(graph: ProductGraph): Set<string> {
  const ids = new Set<string>();
  ids.add('product');
  for (const mod of graph.modules) {
    ids.add(mod.id);
    for (const [key, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item) {
            ids.add((item as { id: string }).id);
          }
        }
      }
    }
  }
  return ids;
}

function buildNodeContentMap(graph: ProductGraph): Map<string, string> {
  const map = new Map<string, string>();
  map.set('product', stableStringify(graph.product));
  for (const mod of graph.modules) {
    map.set(mod.id, stableStringify({ id: mod.id, kind: mod.kind, name: mod.name, imports: mod.imports }));
    for (const [key, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item) {
            map.set((item as { id: string }).id, stableStringify(item));
          }
        }
      }
    }
  }
  return map;
}

function classifyChange(nodeId: string, prev: ProductGraph, next: ProductGraph): ChangeKind {
  // Compare edges to determine if structural vs behavioral
  const prevEdgesFrom = prev.edges.filter((e) => e.from === nodeId);
  const nextEdgesFrom = next.edges.filter((e) => e.from === nodeId);
  const prevEdgeKey = prevEdgesFrom.map(edgeKey).sort().join('|');
  const nextEdgeKey = nextEdgesFrom.map(edgeKey).sort().join('|');

  /* v8 ignore start */
  if (prevEdgeKey !== nextEdgeKey) return 'structurally_changed';
  /* v8 ignore stop */

  // Check governance-related edges
  const govEdges: string[] = ['governs', 'binds_secret', 'uses_secret'];
  const prevGov = prev.edges.filter((e) => e.to === nodeId && govEdges.includes(e.kind));
  const nextGov = next.edges.filter((e) => e.to === nodeId && govEdges.includes(e.kind));
  if (stableStringify(prevGov) !== stableStringify(nextGov)) return 'policy_changed';

  return 'behaviorally_changed';
}

/* v8 ignore start */
function edgeKey(e: GraphEdge): string {
  return `${e.from}-${e.kind}-${e.to}`;
}

function stableStringify(v: unknown): string {
  return JSON.stringify(v, Object.keys(v as object).sort());
}
/* v8 ignore stop */
