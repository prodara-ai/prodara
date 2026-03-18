// ---------------------------------------------------------------------------
// Prodara Compiler — Generator Contracts
// ---------------------------------------------------------------------------
// Defines the interface contract that code generators must implement.
// The compiler itself does not generate code — it produces the Product Graph
// and plan, which generators consume.

import type { ProductGraph } from '../graph/graph-types.js';
import type { Plan } from '../planner/plan-types.js';

/**
 * A generator target descriptor — metadata about a code generator.
 */
export interface GeneratorDescriptor {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedPlatforms: readonly string[];
  readonly supportedNodeKinds: readonly string[];
}

/**
 * A generated artifact — one output file produced by a generator.
 */
export interface GeneratedArtifact {
  readonly path: string;
  readonly nodeId: string;
  readonly generator: string;
  readonly checksum: string;
}

/**
 * The contract that all code generators must implement.
 */
export interface Generator {
  readonly descriptor: GeneratorDescriptor;

  /**
   * Generate artifacts for the given plan and graph.
   * Returns the list of artifacts produced.
   */
  generate(graph: ProductGraph, plan: Plan): Promise<readonly GeneratedArtifact[]>;

  /**
   * Verify that previously generated artifacts are still valid
   * against the current graph.
   */
  verify(graph: ProductGraph, artifacts: readonly GeneratedArtifact[]): Promise<readonly VerificationResult[]>;
}

export interface VerificationResult {
  readonly artifact: GeneratedArtifact;
  readonly valid: boolean;
  readonly message?: string;
}

/**
 * Graph slice — a subset of the product graph for a specific generator category.
 */
export interface GraphSlice {
  readonly category: SliceCategory;
  readonly rootNodeIds: readonly string[];
  readonly nodeIds: readonly string[];
  readonly edges: readonly { from: string; to: string; kind: string }[];
}

export type SliceCategory = 'backend' | 'frontend' | 'api' | 'runtime' | 'schema' | 'test';

/** Node kinds that serve as roots for each slice category */
const SLICE_ROOTS: Record<SliceCategory, readonly string[]> = {
  backend: ['workflow', 'action', 'event', 'schedule', 'execution'],
  frontend: ['surface', 'rendering', 'tokens', 'theme', 'strings'],
  api: ['transport', 'integration', 'serialization'],
  runtime: ['secret', 'environment', 'deployment'],
  schema: ['entity', 'value', 'enum'],
  test: ['test'],
};

/**
 * Extract a category-based slice of the graph.
 * Starts from root nodes matching the category, then walks transitive
 * dependencies through edges to include all reachable nodes.
 */
export function sliceGraph(graph: ProductGraph, category: SliceCategory): GraphSlice {
  const rootKinds = new Set(SLICE_ROOTS[category]);

  // Collect all node IDs and their kinds
  const nodeKindMap = new Map<string, string>();
  for (const mod of graph.modules) {
    for (const [key, value] of Object.entries(mod)) {
      if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'id' in item && 'kind' in item) {
            nodeKindMap.set(item.id as string, item.kind as string);
          }
        }
      }
    }
  }

  // Find root nodes for this category
  const rootNodeIds: string[] = [];
  for (const [id, kind] of nodeKindMap) {
    if (rootKinds.has(kind)) rootNodeIds.push(id);
  }

  // Build adjacency list for transitive dependency walking
  const outEdges = new Map<string, string[]>();
  for (const edge of graph.edges) {
    let targets = outEdges.get(edge.from);
    if (!targets) { targets = []; outEdges.set(edge.from, targets); }
    targets.push(edge.to);
  }

  // BFS from root nodes to collect all reachable node IDs
  const visited = new Set<string>();
  const queue = [...rootNodeIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = outEdges.get(current);
    if (neighbors) {
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
  }

  // Also include governance nodes (constitution/security/privacy/validation) that govern any included node
  for (const edge of graph.edges) {
    if (edge.kind === 'governs' && visited.has(edge.to)) {
      visited.add(edge.from);
    }
  }

  // Collect edges within the slice
  const sliceEdges = graph.edges
    .filter((e) => visited.has(e.from) && visited.has(e.to))
    .map((e) => ({ from: e.from, to: e.to, kind: e.kind }));

  return {
    category,
    rootNodeIds: rootNodeIds.sort(),
    nodeIds: [...visited].sort(),
    edges: sliceEdges,
  };
}

/**
 * Slice the graph into all standard categories.
 */
export function sliceAllCategories(graph: ProductGraph): readonly GraphSlice[] {
  const categories: SliceCategory[] = ['backend', 'frontend', 'api', 'runtime', 'schema', 'test'];
  return categories.map((cat) => sliceGraph(graph, cat));
}
