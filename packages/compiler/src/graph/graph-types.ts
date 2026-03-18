// ---------------------------------------------------------------------------
// Prodara Compiler — Product Graph Types
// ---------------------------------------------------------------------------
// In-memory representation matching the product-graph-format specification.

import type { NodeKind, EdgeKind } from '../types.js';

// ---------------------------------------------------------------------------
// Graph JSON types — deterministic serialization
// ---------------------------------------------------------------------------
export interface ProductGraph {
  readonly format: 'prodara-product-graph';
  readonly version: '0.1.0';
  readonly product: ProductNode;
  readonly modules: readonly ModuleNode[];
  readonly edges: readonly GraphEdge[];
  readonly metadata: GraphMetadata;
}

export interface ProductNode {
  readonly id: 'product';
  readonly kind: 'product';
  readonly name: string;
  readonly title: string | null;
  readonly version: string | null;
  readonly modules: readonly string[];
  readonly publishes: Record<string, readonly string[]> | null;
}

export interface ModuleNode {
  readonly id: string;
  readonly kind: 'module';
  readonly name: string;
  readonly imports: readonly ImportRef[];
  readonly [category: string]: unknown; // e.g. entities, workflows, etc.
}

export interface ImportRef {
  readonly symbol: string;
  readonly from: string;
  readonly alias: string | null;
}

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
}

export interface GraphMetadata {
  readonly compiler: string;
  readonly compiled_at: string;
  readonly source_files: readonly string[];
}

// ---------------------------------------------------------------------------
// Shared utility — collect every node ID from a graph
// ---------------------------------------------------------------------------

/**
 * Walk the product graph and return the set of all node IDs
 * (product, modules, and every module-level child with an `id` property).
 */
export function collectAllNodeIds(graph: ProductGraph): Set<string> {
  const ids = new Set<string>();
  ids.add('product');
  for (const mod of graph.modules) {
    ids.add(mod.id);
    for (const [, value] of Object.entries(mod)) {
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

// ---------------------------------------------------------------------------
// Graph-level node shape (used for declaration serialization)
// ---------------------------------------------------------------------------
export interface GraphNodeBase {
  readonly id: string;
  readonly kind: NodeKind;
  readonly name: string;
}

export interface FieldRef {
  readonly name: string;
  readonly type: GraphTypeRef;
}

export type GraphTypeRef =
  | string                                              // primitive name
  | { readonly ref: string }                           // reference node id
  | { readonly generic: string; readonly arg: GraphTypeRef }; // optional<T>, list<T>

export interface ExpressionJson {
  readonly [key: string]: unknown;
}
