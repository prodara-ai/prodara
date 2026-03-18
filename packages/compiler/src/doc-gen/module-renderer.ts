// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Module Renderer
// ---------------------------------------------------------------------------
// Orchestrates all section renderers to produce a complete module doc.

import type { ModuleNode, ProductGraph } from '../graph/graph-types.js';
import { renderBanner, humanize } from './format-helpers.js';
import type { SectionContext } from './section-renderers.js';
import {
  renderActorsSection,
  renderDomainSection,
  renderRulesSection,
  renderWorkflowsSection,
  renderActionsSection,
  renderEventsSection,
  renderSchedulesSection,
  renderSurfacesSection,
  renderDesignSection,
  renderStorageSection,
  renderGovernanceSection,
  renderTestsSection,
} from './section-renderers.js';

/**
 * Render a complete human-readable markdown document for one module.
 */
export function renderModuleDoc(
  mod: ModuleNode,
  graph: ProductGraph,
  resolveString: (ref: string | null) => string | null,
  resolveLink: (nodeId: string, fromModule: string) => string,
): string {
  const lines: string[] = [];

  // Source file hint — use the module name as the source reference
  lines.push(...renderBanner(`${mod.name}.prd`));
  lines.push(`# ${humanize(mod.name)}`);
  lines.push('');

  // Imports
  if (mod.imports.length > 0) {
    lines.push('**Imports:**');
    for (const imp of mod.imports) {
      lines.push(`- \`${imp.symbol}\` from \`${imp.from}\`${imp.alias ? ` (as \`${imp.alias}\`)` : ''}`);
    }
    lines.push('');
  }

  // Build section context
  const ctx: SectionContext = {
    mod,
    edges: graph.edges,
    resolveString,
    resolveLink,
  };

  // Render all sections in order
  const sectionRenderers = [
    renderActorsSection,
    renderDomainSection,
    renderRulesSection,
    renderWorkflowsSection,
    renderActionsSection,
    renderEventsSection,
    renderSchedulesSection,
    renderSurfacesSection,
    renderDesignSection,
    renderStorageSection,
    renderGovernanceSection,
    renderTestsSection,
  ];

  for (const renderer of sectionRenderers) {
    const sectionLines = renderer(ctx);
    if (sectionLines.length > 0) {
      lines.push(...sectionLines);
    }
  }

  return lines.join('\n');
}
