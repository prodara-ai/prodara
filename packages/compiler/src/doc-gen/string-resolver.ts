// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen String Resolver
// ---------------------------------------------------------------------------
// Resolves qualified string references (e.g. "board.board_strings.title")
// to default-locale values from the product graph's strings nodes.

import type { ProductGraph } from '../graph/graph-types.js';
import { getArrayProp } from './format-helpers.js';
import type { StringsNode } from './doc-gen-types.js';

/**
 * Create a string resolver that resolves qualified refs like
 * `module.string_set.key` to their default-locale string values.
 * Falls back to the raw reference path if unresolvable.
 */
export function createStringResolver(
  graph: ProductGraph,
): (ref: string | null) => string | null {
  const stringsMap = new Map<string, Readonly<Record<string, string>>>();

  for (const mod of graph.modules) {
    const stringsNodes = getArrayProp<StringsNode>(mod, 'strings');    for (const node of stringsNodes) {
      // Key by qualified id: "module.strings.set_name"
      stringsMap.set(node.id, node.entries);
      // Also key by "module.set_name" for the common shorthand
      stringsMap.set(`${mod.name}.${node.name}`, node.entries);
    }
  }

  return (ref: string | null): string | null => {
    if (!ref) return null;

    // Try three-part: module.string_set.key
    const parts = ref.split('.');
    if (parts.length >= 3) {
      // Try "module.string_set" → entries[key]
      const key = parts[parts.length - 1]!;
      const setPath = parts.slice(0, -1).join('.');
      const entries = stringsMap.get(setPath);
      if (entries && key in entries) {
        return entries[key]!;
      }

      // Try with "module.strings.set_name" prefix
      const altSetPath = `${parts[0]}.strings.${parts[1]}`;
      const altEntries = stringsMap.get(altSetPath);
      if (altEntries && key in altEntries) {
        return altEntries[key]!;
      }
    }

    // Unresolvable — return raw ref as fallback
    return ref;
  };
}
