// ---------------------------------------------------------------------------
// Prodara Compiler — Architecture Reviewer
// ---------------------------------------------------------------------------
// Validates architectural quality: module boundaries, dependency patterns,
// authorization coverage, and circular dependency risks.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const architectureReviewer: ReviewerAgent = {
  name: 'architecture',
  description: 'Validates module boundaries, dependency patterns, and authorization coverage',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    // Check: every module should have at least one entity or workflow
    for (const mod of graph.modules) {
      const entities = getNodeArray(mod, 'entities');
      const workflows = getNodeArray(mod, 'workflows');
      if (entities.length === 0 && workflows.length === 0) {
        findings.push({
          reviewer: 'architecture',
          severity: 'warning',
          category: 'empty_module',
          nodeId: mod.id,
          message: `Module "${mod.name}" has no entities or workflows`,
          suggestion: 'Consider adding domain constructs or merging into another module',
        });
      }
    }

    // Check: workflows should have authorization
    for (const mod of graph.modules) {
      for (const wf of getNodeArray(mod, 'workflows')) {
        const hasAuth = graph.edges.some(
          (e) => e.from === wf.id && e.kind === 'authorized_as',
        );
        if (!hasAuth) {
          findings.push({
            reviewer: 'architecture',
            severity: 'warning',
            category: 'missing_authorization',
            nodeId: wf.id,
            message: `Workflow "${wf.name}" in module "${mod.name}" has no authorization`,
            suggestion: 'Add an authorization block to restrict access',
          });
        }
      }
    }

    // Check: cross-module dependency density
    const crossModuleEdges = graph.edges.filter((e) => {
      const fromMod = extractModule(e.from);
      const toMod = extractModule(e.to);
      return fromMod && toMod && fromMod !== toMod;
    });
    const moduleCount = graph.modules.length;
    if (moduleCount > 1 && crossModuleEdges.length > moduleCount * 10) {
      findings.push({
        reviewer: 'architecture',
        severity: 'info',
        category: 'high_coupling',
        message: `High cross-module coupling: ${crossModuleEdges.length} cross-module edges across ${moduleCount} modules`,
        suggestion: 'Consider refactoring to reduce inter-module dependencies',
      });
    }

    return findings;
  },
};

function extractModule(nodeId: string): string | null {
  const parts = nodeId.split('.');
  return parts.length >= 2 ? parts[0]! : null;
}

interface NamedNode {
  readonly id: string;
  readonly name: string;
}

function getNodeArray(mod: ModuleNode, category: string): readonly NamedNode[] {
  const val = mod[category];
  if (!Array.isArray(val)) return [];
  return val as readonly NamedNode[];
}
