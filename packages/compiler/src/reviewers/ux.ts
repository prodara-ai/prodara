// ---------------------------------------------------------------------------
// Prodara Compiler — UX Reviewer
// ---------------------------------------------------------------------------
// Validates UX quality: surfaces have actions, forms have validation rules,
// renderings are referenced, and design tokens are present when surfaces exist.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const uxReviewer: ReviewerAgent = {
  name: 'ux',
  description: 'Validates UX completeness: surfaces, renderings, tokens, and forms',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    for (const mod of graph.modules) {
      const surfaces = getNodeArray(mod, 'surfaces');
      const renderings = getNodeArray(mod, 'renderings');
      const tokens = getNodeArray(mod, 'tokens');

      // Check: surfaces should have renderings
      const renderingTargets = new Set(
        graph.edges
          .filter((e) => e.kind === 'targets_surface')
          .map((e) => e.to),
      );
      for (const surface of surfaces) {
        if (!renderingTargets.has(surface.id)) {
          findings.push({
            reviewer: 'ux',
            severity: 'info',
            category: 'missing_rendering',
            nodeId: surface.id,
            message: `Surface "${surface.name}" in module "${mod.name}" has no rendering targeting it`,
            suggestion: 'Add a rendering block for visual specification',
          });
        }
      }

      // Check: if module has surfaces, it should have design tokens
      if (surfaces.length > 0 && tokens.length === 0) {
        findings.push({
          reviewer: 'ux',
          severity: 'info',
          category: 'missing_tokens',
          nodeId: mod.id,
          message: `Module "${mod.name}" has surfaces but no design tokens`,
          suggestion: 'Add tokens for consistent visual styling',
        });
      }

      // Check: renderings should reference a surface
      const rendSurfaceEdges = new Set(
        graph.edges
          .filter((e) => e.kind === 'targets_surface')
          .map((e) => e.from),
      );
      for (const rendering of renderings) {
        if (!rendSurfaceEdges.has(rendering.id)) {
          findings.push({
            reviewer: 'ux',
            severity: 'warning',
            category: 'unbound_rendering',
            nodeId: rendering.id,
            message: `Rendering "${rendering.name}" in module "${mod.name}" does not target any surface`,
            suggestion: 'Bind the rendering to a surface with targets_surface',
          });
        }
      }

      // Check: surfaces with form-like actions should use rules for validation
      checkFormValidation(graph, mod, surfaces, findings);
    }

    return findings;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NamedNode {
  readonly id: string;
  readonly name: string;
}

function getNodeArray(mod: ModuleNode, category: string): readonly NamedNode[] {
  const val = mod[category];
  if (!Array.isArray(val)) return [];
  return val as readonly NamedNode[];
}

function checkFormValidation(
  graph: ProductGraph,
  mod: ModuleNode,
  surfaces: readonly NamedNode[],
  findings: ReviewFinding[],
): void {
  // Look for surfaces associated with actions that write data (create/update patterns)
  for (const surface of surfaces) {
    const actionEdges = graph.edges.filter(
      (e) => e.from === surface.id && e.kind === 'exposes_action',
    );
    if (actionEdges.length === 0) continue;

    // Check if any exposed action writes data
    const writingActions = actionEdges.filter((ae) =>
      graph.edges.some((e) => e.from === ae.to && e.kind === 'writes'),
    );

    if (writingActions.length > 0) {
      // Surface exposes write-actions → should use rules
      const hasRuleEdge = graph.edges.some(
        (e) => e.from === surface.id && e.kind === 'uses_rule',
      );
      if (!hasRuleEdge) {
        findings.push({
          reviewer: 'ux',
          severity: 'info',
          category: 'form_missing_rules',
          nodeId: surface.id,
          message: `Surface "${surface.name}" in module "${mod.name}" exposes write actions but has no validation rules`,
          suggestion: 'Add uses_rule edges for form validation',
        });
      }
    }
  }
}
