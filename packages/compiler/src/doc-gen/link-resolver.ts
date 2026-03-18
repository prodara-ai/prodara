// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Link Resolver
// ---------------------------------------------------------------------------
// Generates cross-module markdown links and same-module anchor links.

import type { ProductGraph } from '../graph/graph-types.js';
import { toAnchor, humanize } from './format-helpers.js';

/**
 * Section heading anchors keyed by node kind.
 * Used to link to the correct section within a module doc.
 */
const KIND_TO_SECTION: Record<string, string> = {
  entity: 'Domain Model',
  value: 'Domain Model',
  enum: 'Domain Model',
  rule: 'Business Rules',
  actor: 'Actors & Capabilities',
  capability: 'Actors & Capabilities',
  workflow: 'Workflows',
  action: 'Actions',
  event: 'Events',
  schedule: 'Schedules',
  surface: 'Surfaces',
  rendering: 'Surfaces',
  tokens: 'Design System',
  theme: 'Design System',
  strings: 'Design System',
  storage: 'Storage',
  integration: 'Platform',
  transport: 'Platform',
  execution: 'Platform',
  extension: 'Platform',
  security: 'Governance',
  privacy: 'Governance',
  validation: 'Governance',
  constitution: 'Governance',
  secret: 'Runtime',
  environment: 'Runtime',
  deployment: 'Runtime',
  test: 'Tests',
};

/**
 * Create a link resolver for cross-module and same-module references.
 *
 * @param graph The product graph (used to look up which module a node belongs to)
 * @returns A function that given a node id and the current module name,
 *          returns a markdown link string
 */
export function createLinkResolver(
  graph: ProductGraph,
): (nodeId: string, fromModule: string) => string {
  // Build a map from node id → { moduleName, kind, name }
  const nodeIndex = new Map<string, { moduleName: string; kind: string; name: string }>();

  for (const mod of graph.modules) {
    for (const [key, value] of Object.entries(mod)) {
      if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
      /* v8 ignore next -- all graph module properties past id/kind/name/imports are arrays */
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (item && typeof item === 'object' && 'id' in item && 'kind' in item && 'name' in item) {
          nodeIndex.set(item.id as string, {
            moduleName: mod.name,
            kind: item.kind as string,
            name: item.name as string,
          });
        }
      }
    }
  }

  return (nodeId: string, fromModule: string): string => {
    const node = nodeIndex.get(nodeId);
    if (!node) {
      // Can't resolve — just return the last segment as plain text
      const parts = nodeId.split('.');
      /* v8 ignore next -- split always returns ≥1 element */
      return parts[parts.length - 1] ?? nodeId;
    }

    /* v8 ignore next -- all known kinds are in KIND_TO_SECTION */
    const sectionTitle = KIND_TO_SECTION[node.kind] ?? humanize(node.kind);
    const anchor = `#${toAnchor(sectionTitle)}`;

    if (node.moduleName === fromModule) {
      // Same-module anchor link
      return `[${node.name}](${anchor})`;
    }

    // Cross-module link
    return `[${node.name}](${node.moduleName}.md${anchor})`;
  };
}
