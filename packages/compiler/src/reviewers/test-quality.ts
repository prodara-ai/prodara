// ---------------------------------------------------------------------------
// Prodara Compiler — Test Quality Reviewer
// ---------------------------------------------------------------------------
// Validates test coverage and quality: spec test presence, test-to-entity
// ratio, workflow test coverage, and missing edge case detection.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const testQualityReviewer: ReviewerAgent = {
  name: 'testQuality',
  description: 'Validates test coverage, test-to-entity ratio, and spec test quality',

  review(graph: ProductGraph, spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    let totalEntities = 0;
    let totalTests = 0;

    for (const mod of graph.modules) {
      const entities = getNodeArray(mod, 'entities');
      const tests = getNodeArray(mod, 'tests');
      totalEntities += entities.length;
      totalTests += tests.length;

      // Check: modules with entities should have spec tests
      if (entities.length > 0 && tests.length === 0) {
        findings.push({
          reviewer: 'testQuality',
          severity: 'warning',
          category: 'missing_tests',
          nodeId: mod.id,
          message: `Module "${mod.name}" has ${entities.length} entities but no spec tests`,
          suggestion: 'Add test blocks to validate entity behavior and rules',
        });
      }

      // Check: test-to-entity ratio (at least 1 test per entity)
      if (entities.length > 0 && tests.length > 0 && tests.length < entities.length) {
        findings.push({
          reviewer: 'testQuality',
          severity: 'info',
          category: 'low_test_ratio',
          nodeId: mod.id,
          message: `Module "${mod.name}" has ${tests.length} test(s) for ${entities.length} entities`,
          suggestion: 'Consider adding tests for each entity to improve coverage',
        });
      }

      // Check: workflows should have associated tests
      const workflows = getNodeArray(mod, 'workflows');
      for (const wf of workflows) {
        const hasTest = graph.edges.some(
          (e) => e.to === wf.id && e.kind === 'tests',
        );
        if (!hasTest && tests.length > 0) {
          findings.push({
            reviewer: 'testQuality',
            severity: 'info',
            category: 'untested_workflow',
            nodeId: wf.id,
            message: `Workflow "${wf.name}" in module "${mod.name}" has no associated test`,
            suggestion: 'Add a test block to validate this workflow',
          });
        }
      }
    }

    // Check: global test ratio
    if (totalEntities > 3 && totalTests === 0) {
      findings.push({
        reviewer: 'testQuality',
        severity: 'error',
        category: 'no_tests',
        message: `Product has ${totalEntities} entities but no spec tests at all`,
        suggestion: 'Add test blocks to validate product behavior',
      });
    }

    // Check: new/modified nodes in spec should have tests
    const modifiedNodes = spec.tasks
      .filter((t) => t.action === 'generate' || t.action === 'regenerate')
      .map((t) => t.nodeId);

    if (modifiedNodes.length > 0 && totalTests === 0) {
      findings.push({
        reviewer: 'testQuality',
        severity: 'warning',
        category: 'changes_without_tests',
        message: `${modifiedNodes.length} node(s) changed but no spec tests exist to catch regressions`,
        suggestion: 'Add tests for changed nodes to prevent regressions',
      });
    }

    return findings;
  },
};

interface NamedNode {
  readonly id: string;
  readonly name: string;
}

function getNodeArray(mod: ModuleNode, category: string): readonly NamedNode[] {
  const val = mod[category];
  if (!Array.isArray(val)) return [];
  return val as readonly NamedNode[];
}
