// ---------------------------------------------------------------------------
// Prodara Compiler — Deterministic Graph Serializer
// ---------------------------------------------------------------------------
// Produces byte-identical JSON for identical graphs per spec requirements.

import type { ProductGraph } from './graph-types.js';

/**
 * Serialize a ProductGraph to deterministic JSON.
 * - Alphabetical key ordering at every level
 * - 2-space indentation
 * - UTF-8 string
 */
export function serializeGraph(graph: ProductGraph): string {
  return JSON.stringify(sortKeys(graph), null, 2);
}

/**
 * Deep-sort all object keys alphabetically for determinism.
 */
function sortKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}
