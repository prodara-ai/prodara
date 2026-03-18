// ---------------------------------------------------------------------------
// Prodara Compiler — Quality Reviewer
// ---------------------------------------------------------------------------
// Validates product quality: entity rule coverage, spec test coverage,
// naming conventions, and completeness of definitions.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const qualityReviewer: ReviewerAgent = {
  name: 'quality',
  description: 'Validates rule coverage, test coverage, and naming conventions',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    for (const mod of graph.modules) {
      // Check: entities should have associated rules
      const entities = getNodeArray(mod, 'entities');
      const rules = getNodeArray(mod, 'rules');
      const ruleEdgeTargets = new Set(
        graph.edges.filter((e) => e.kind === 'uses_rule').map((e) => e.from),
      );

      for (const entity of entities) {
        if (!ruleEdgeTargets.has(entity.id)) {
          findings.push({
            reviewer: 'quality',
            severity: 'info',
            category: 'missing_rules',
            nodeId: entity.id,
            message: `Entity "${entity.name}" in module "${mod.name}" has no associated rules`,
            suggestion: 'Consider adding business rules for validation or invariants',
          });
        }
      }

      // Check: module should have spec tests
      const tests = getNodeArray(mod, 'tests');
      if (entities.length + rules.length > 0 && tests.length === 0) {
        findings.push({
          reviewer: 'quality',
          severity: 'warning',
          category: 'missing_tests',
          nodeId: mod.id,
          message: `Module "${mod.name}" has no spec tests`,
          suggestion: 'Add spec tests to verify entity and rule behavior',
        });
      }

      // Check: naming conventions (snake_case for node names)
      checkNamingConventions(mod, findings);
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

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

function checkNamingConventions(mod: ModuleNode, findings: ReviewFinding[]): void {
  const categories = ['entities', 'rules', 'workflows', 'events', 'surfaces'];
  for (const cat of categories) {
    for (const node of getNodeArray(mod, cat)) {
      if (!SNAKE_CASE_RE.test(node.name)) {
        findings.push({
          reviewer: 'quality',
          severity: 'info',
          category: 'naming_convention',
          nodeId: node.id,
          message: `Node "${node.name}" does not follow snake_case naming`,
          suggestion: `Rename to "${toSnakeCase(node.name)}"`,
        });
      }
    }
  }
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}
