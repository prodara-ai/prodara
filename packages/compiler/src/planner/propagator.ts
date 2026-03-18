// ---------------------------------------------------------------------------
// Prodara Compiler — Impact Propagator
// ---------------------------------------------------------------------------
// Given a set of changed nodes, propagates impact along graph edges.

import type { ProductGraph } from '../graph/graph-types.js';
import type { NodeChange, ImpactEntry } from './plan-types.js';

export function propagateImpact(
  graph: ProductGraph,
  changes: readonly NodeChange[],
): ImpactEntry[] {
  const impacts: ImpactEntry[] = [];
  const visited = new Set<string>();
  const changedIds = new Set(changes.map((c) => c.nodeId));

  // Build reverse adjacency: to -> [(from, kind)]
  const reverseAdj = new Map<string, { from: string; kind: string }[]>();
  for (const edge of graph.edges) {
    const arr = reverseAdj.get(edge.to) ?? [];
    arr.push({ from: edge.from, kind: edge.kind });
    reverseAdj.set(edge.to, arr);
  }

  // BFS from changed nodes along reverse edges
  const queue: { nodeId: string; reason: string; via: string; depth: number }[] = [];
  for (const change of changes) {
    queue.push({ nodeId: change.nodeId, reason: `${change.changeKind}`, via: 'direct', depth: 0 });
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    const dependents = reverseAdj.get(item.nodeId) ?? [];

    for (const dep of dependents) {
      if (visited.has(dep.from) || changedIds.has(dep.from)) continue;
      visited.add(dep.from);
      const depth = item.depth + 1;
      impacts.push({
        nodeId: dep.from,
        reason: `depends on ${item.nodeId} (${item.reason})`,
        via: dep.kind,
        depth,
      });
      queue.push({ nodeId: dep.from, reason: `impact from ${item.nodeId}`, via: dep.kind, depth });
    }
  }

  return impacts.sort((a, b) => {
    const d = a.depth - b.depth;
    if (d !== 0) return d;
    return a.nodeId.localeCompare(b.nodeId);
  });
}
