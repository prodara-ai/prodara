// ---------------------------------------------------------------------------
// Prodara Compiler — Code Quality Reviewer
// ---------------------------------------------------------------------------
// Validates graph structural quality: orphan nodes, edge validity,
// duplicate identifiers, and consistent graph structure.

import type { ProductGraph } from '../graph/graph-types.js';
import { collectAllNodeIds } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const codeQualityReviewer: ReviewerAgent = {
  name: 'codeQuality',
  description: 'Validates graph structure: orphans, edge validity, and duplicates',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    const allNodeIds = collectAllNodeIds(graph);

    // Check: edges reference valid nodes
    for (const edge of graph.edges) {
      if (!allNodeIds.has(edge.from)) {
        findings.push({
          reviewer: 'codeQuality',
          severity: 'error',
          category: 'invalid_edge_source',
          message: `Edge "${edge.kind}" has source "${edge.from}" which is not in the graph`,
        });
      }
      if (!allNodeIds.has(edge.to)) {
        findings.push({
          reviewer: 'codeQuality',
          severity: 'error',
          category: 'invalid_edge_target',
          message: `Edge "${edge.kind}" has target "${edge.to}" which is not in the graph`,
        });
      }
    }

    // Check: orphan nodes (non-module, non-product nodes with no edges)
    const connectedNodes = new Set<string>();
    for (const edge of graph.edges) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
    for (const id of allNodeIds) {
      if (id === 'product') continue;
      // Module nodes are connected via 'contains' edges automatically
      if (graph.modules.some((m) => m.id === id)) continue;
      if (!connectedNodes.has(id)) {
        findings.push({
          reviewer: 'codeQuality',
          severity: 'warning',
          category: 'orphan_node',
          nodeId: id,
          message: `Node "${id}" has no edges — it may be orphaned`,
          suggestion: 'Verify this node is intentionally disconnected or add relationships',
        });
      }
    }

    // Check: duplicate edge detection
    const edgeSet = new Set<string>();
    for (const edge of graph.edges) {
      const key = `${edge.from}|${edge.to}|${edge.kind}`;
      if (edgeSet.has(key)) {
        findings.push({
          reviewer: 'codeQuality',
          severity: 'warning',
          category: 'duplicate_edge',
          message: `Duplicate edge: ${edge.from} -> ${edge.to} (${edge.kind})`,
        });
      }
      edgeSet.add(key);
    }

    return findings;
  },
};
