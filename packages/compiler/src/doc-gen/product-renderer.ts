// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Product Overview Renderer
// ---------------------------------------------------------------------------
// Renders the top-level README.md with product info, module table, and
// cross-module actor/capability summary.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import { renderBanner, renderTable, humanize, getArrayProp, shortName } from './format-helpers.js';
import type { ActorNode, CapabilityNode } from './doc-gen-types.js';

// ---------------------------------------------------------------------------
// Product overview
// ---------------------------------------------------------------------------

/**
 * Render the product-level README.md overview document.
 */
export function renderProductOverview(
  graph: ProductGraph,
  resolveString: (ref: string | null) => string | null,
): string {
  const lines: string[] = [];

  lines.push(...renderBanner(`${graph.product.name}.prd`));

  const title = resolveString(graph.product.title) ?? humanize(graph.product.name);
  lines.push(`# ${title}`);
  lines.push('');

  if (graph.product.version) {
    lines.push(`**Version:** ${graph.product.version}`);
    lines.push('');
  }

  // Module table
  lines.push('## Modules');
  lines.push('');
  lines.push(...renderTable(
    ['Module', 'Description'],
    graph.modules.map(m => [
      `[${humanize(m.name)}](${m.name}.md)`,
      getModuleSummary(m),
    ]),
  ));
  lines.push('');

  // Cross-module actor summary
  const allActors: { actor: ActorNode; module: string }[] = [];
  const allCapabilities: { cap: CapabilityNode; module: string }[] = [];
  for (const mod of graph.modules) {
    for (const actor of getArrayProp<ActorNode>(mod, 'actors')) {
      allActors.push({ actor, module: mod.name });
    }
    for (const cap of getArrayProp<CapabilityNode>(mod, 'capabilities')) {
      allCapabilities.push({ cap, module: mod.name });
    }
  }

  if (allActors.length > 0) {
    lines.push('## Actors');
    lines.push('');
    lines.push(...renderTable(
      ['Actor', 'Module', 'Description'],
      allActors.map(({ actor, module }) => [
        `**${humanize(actor.name)}**`,
        `[${humanize(module)}](${module}.md)`,
        /* v8 ignore next -- actor always has description */
        actor.description ?? actor.title ?? '—',
      ]),
    ));
    lines.push('');
  }

  if (allCapabilities.length > 0) {
    lines.push('## Capabilities');
    lines.push('');
    lines.push(...renderTable(
      ['Capability', 'Module', 'Actors'],
      allCapabilities.map(({ cap, module }) => [
        `**${humanize(cap.name)}**`,
        `[${humanize(module)}](${module}.md)`,
        /* v8 ignore next -- capability always has actors */
        cap.actors.map(a => shortName(a)).join(', ') || '—',
      ]),
    ));
    lines.push('');
  }

  // Module dependency diagram (if any imports exist)
  const hasImports = graph.modules.some(m => m.imports.length > 0);
  if (hasImports) {
    lines.push('## Module Dependencies');
    lines.push('');
    lines.push('```mermaid');
    lines.push('graph LR');
    for (const mod of graph.modules) {
      for (const imp of mod.imports) {
        lines.push(`    ${mod.name} --> ${imp.from}`);
      }
    }
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getModuleSummary(mod: ModuleNode): string {
  const counts: string[] = [];
  const categories: [string, string][] = [
    ['entities', 'entities'],
    ['workflows', 'workflows'],
    ['surfaces', 'surfaces'],
    ['events', 'events'],
    ['tokens', 'token sets'],
  ];

  for (const [key, label] of categories) {
    const arr = getArrayProp<unknown>(mod, key);
    if (arr.length > 0) {
      counts.push(`${arr.length} ${label}`);
    }
  }

  return counts.length > 0 ? counts.join(', ') : '—';
}
