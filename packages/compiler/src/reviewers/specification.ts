// ---------------------------------------------------------------------------
// Prodara Compiler — Specification Reviewer
// ---------------------------------------------------------------------------
// Validates specification completeness: all modules referenced in product,
// imports resolved, surfaces have actions, and required constructs present.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const specificationReviewer: ReviewerAgent = {
  name: 'specification',
  description: 'Validates specification completeness and reference integrity',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    // Check: product lists all modules
    const declaredModuleIds = new Set(graph.product.modules);
    for (const mod of graph.modules) {
      if (!declaredModuleIds.has(mod.id)) {
        findings.push({
          reviewer: 'specification',
          severity: 'error',
          category: 'unlisted_module',
          nodeId: mod.id,
          message: `Module "${mod.name}" exists in graph but is not listed in the product declaration`,
          suggestion: 'Add the module to the product block',
        });
      }
    }

    for (const modId of declaredModuleIds) {
      if (!graph.modules.some((m) => m.id === modId)) {
        findings.push({
          reviewer: 'specification',
          severity: 'error',
          category: 'missing_module',
          nodeId: modId,
          message: `Product references module "${modId}" which does not exist`,
          suggestion: 'Create the module or remove the reference',
        });
      }
    }

    // Check: all imports are resolved
    for (const mod of graph.modules) {
      for (const imp of mod.imports) {
        const targetModName = imp.from;
        const targetMod = graph.modules.find((m) => m.name === targetModName);
        if (!targetMod) {
          findings.push({
            reviewer: 'specification',
            severity: 'error',
            category: 'unresolved_import',
            nodeId: mod.id,
            message: `Module "${mod.name}" imports "${imp.symbol}" from "${targetModName}" which cannot be found`,
          });
        }
      }
    }

    // Check: surfaces should have at least one action edge
    for (const mod of graph.modules) {
      const surfaces = getNodeArray(mod, 'surfaces');
      for (const surface of surfaces) {
        const hasAction = graph.edges.some(
          (e) => e.from === surface.id && e.kind === 'exposes_action',
        );
        if (!hasAction) {
          findings.push({
            reviewer: 'specification',
            severity: 'warning',
            category: 'actionless_surface',
            nodeId: surface.id,
            message: `Surface "${surface.name}" in module "${mod.name}" exposes no actions`,
            suggestion: 'Add action bindings to the surface',
          });
        }
      }
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
