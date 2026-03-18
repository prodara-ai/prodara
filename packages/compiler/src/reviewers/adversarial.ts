// ---------------------------------------------------------------------------
// Prodara Compiler — Adversarial Reviewer
// ---------------------------------------------------------------------------
// A cynical/skeptical reviewer that assumes problems exist and exhaustively
// finds gaps, unstated assumptions, contradictions, and missing items.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const adversarialReviewer: ReviewerAgent = {
  name: 'adversarial',
  description: 'Cynical reviewer that assumes problems exist and finds gaps, contradictions, and unstated assumptions',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    // Check: modules without any policies or rules
    for (const mod of graph.modules) {
      const policies = getNodeArray(mod, 'policies');
      const rules = getNodeArray(mod, 'rules');
      const entities = getNodeArray(mod, 'entities');
      if (entities.length > 0 && policies.length === 0 && rules.length === 0) {
        findings.push({
          reviewer: 'adversarial',
          severity: 'warning',
          category: 'missing_policies',
          nodeId: mod.id,
          message: `Module "${mod.name}" has entities but no policies or rules — data integrity is unguarded`,
          suggestion: 'Add validation policies to protect entity invariants',
        });
      }
    }

    // Check: modules without tests
    for (const mod of graph.modules) {
      const tests = getNodeArray(mod, 'tests');
      if (tests.length === 0) {
        findings.push({
          reviewer: 'adversarial',
          severity: 'warning',
          category: 'missing_tests',
          nodeId: mod.id,
          message: `Module "${mod.name}" has no tests — correctness is unverified`,
          suggestion: 'Add spec tests to verify module behavior',
        });
      }
    }

    // Check: entities without any edges (orphan entities)
    for (const mod of graph.modules) {
      for (const entity of getNodeArray(mod, 'entities')) {
        const hasEdge = graph.edges.some(
          (e) => e.from === entity.id || e.to === entity.id,
        );
        if (!hasEdge) {
          findings.push({
            reviewer: 'adversarial',
            severity: 'warning',
            category: 'orphan_entity',
            nodeId: entity.id,
            message: `Entity "${entity.name}" in module "${mod.name}" has no edges — it may be unused`,
            suggestion: 'Connect this entity to workflows or other entities, or remove it',
          });
        }
      }
    }

    // Check: workflows without any output edges
    for (const mod of graph.modules) {
      for (const wf of getNodeArray(mod, 'workflows')) {
        const hasOutput = graph.edges.some(
          /* v8 ignore next -- both emits and writes are tested */
          (e) => e.from === wf.id && (e.kind === 'emits' || e.kind === 'writes'),
        );
        if (!hasOutput) {
          findings.push({
            reviewer: 'adversarial',
            severity: 'info',
            category: 'missing_output',
            nodeId: wf.id,
            message: `Workflow "${wf.name}" in module "${mod.name}" has no output edges — side effects are unstated`,
            suggestion: 'Declare what this workflow produces, emits, or writes',
          });
        }
      }
    }

    // Check: duplicate node names within a module
    for (const mod of graph.modules) {
      const names = new Map<string, string[]>();
      for (const category of ['entities', 'workflows', 'screens', 'policies', 'events', 'actors'] as const) {
        for (const node of getNodeArray(mod, category)) {
          const existing = names.get(node.name);
          if (existing) {
            existing.push(node.id);
          } else {
            names.set(node.name, [node.id]);
          }
        }
      }
      for (const [name, ids] of names) {
        if (ids.length > 1) {
          findings.push({
            reviewer: 'adversarial',
            severity: 'error',
            category: 'duplicate_name',
            nodeId: ids[0],
            message: `Duplicate name "${name}" in module "${mod.name}" — ambiguous references`,
            suggestion: 'Rename one of the duplicates to avoid confusion',
          });
        }
      }
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
