// ---------------------------------------------------------------------------
// Prodara Compiler — Edge Case Hunter Reviewer
// ---------------------------------------------------------------------------
// Systematic branching-path analysis: missing default/else paths,
// empty collections, boundary conditions, and race-condition risks.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const edgeCaseReviewer: ReviewerAgent = {
  name: 'edgeCase',
  description: 'Systematic branching-path analysis for missing defaults, empty collections, boundaries, and race conditions',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    // Check: entities with no fields defined (empty schema)
    for (const mod of graph.modules) {
      for (const entity of getNodeArray(mod, 'entities')) {
        const fields = getStringArray(entity, 'fields');
        if (fields.length === 0) {
          findings.push({
            reviewer: 'edgeCase',
            severity: 'warning',
            category: 'empty_entity',
            nodeId: entity.id,
            message: `Entity "${entity.name}" in module "${mod.name}" has no fields — edge case: what represents its state?`,
            suggestion: 'Define at least an identifier field for this entity',
          });
        }
      }
    }

    // Check: workflows that read entities but have no error/failure edge
    for (const mod of graph.modules) {
      for (const wf of getNodeArray(mod, 'workflows')) {
        const readsEntity = graph.edges.some(
          (e) => e.from === wf.id && e.kind === 'reads',
        );
        const hasErrorEdge = graph.edges.some(
          (e) => e.from === wf.id && e.kind === 'emits',
        );
        if (readsEntity && !hasErrorEdge) {
          findings.push({
            reviewer: 'edgeCase',
            severity: 'info',
            category: 'missing_error_path',
            nodeId: wf.id,
            message: `Workflow "${wf.name}" reads data but has no error path — what happens when the entity is not found?`,
            suggestion: 'Add error handling for missing or invalid data scenarios',
          });
        }
      }
    }

    // Check: modules with a single entity and no workflows (boundary: no behavior)
    for (const mod of graph.modules) {
      const entities = getNodeArray(mod, 'entities');
      const workflows = getNodeArray(mod, 'workflows');
      if (entities.length === 1 && workflows.length === 0) {
        findings.push({
          reviewer: 'edgeCase',
          severity: 'info',
          category: 'single_entity_no_workflow',
          nodeId: mod.id,
          message: `Module "${mod.name}" has one entity and no workflows — boundary case: no defined behavior`,
          suggestion: 'Add workflows or merge this module into a parent module',
        });
      }
    }

    // Check: events with no subscribers (dead events)
    for (const mod of graph.modules) {
      for (const event of getNodeArray(mod, 'events')) {
        const hasSubscriber = graph.edges.some(
          (e) => e.to === event.id && e.kind === 'triggers_on',
        );
        const isEmitted = graph.edges.some(
          (e) => e.to === event.id && e.kind === 'emits',
        );
        if (isEmitted && !hasSubscriber) {
          findings.push({
            reviewer: 'edgeCase',
            severity: 'warning',
            category: 'dead_event',
            nodeId: event.id,
            message: `Event "${event.name}" is emitted but has no subscribers — messages are silently lost`,
            suggestion: 'Add a subscriber or remove the event if it is no longer needed',
          });
        }
      }
    }

    // Check: actors with no workflows (unused actors)
    for (const mod of graph.modules) {
      for (const actor of getNodeArray(mod, 'actors')) {
        const hasWorkflow = graph.edges.some(
          (e) => e.to === actor.id && e.kind === 'authorized_as',
        );
        if (!hasWorkflow) {
          findings.push({
            reviewer: 'edgeCase',
            severity: 'info',
            category: 'unused_actor',
            nodeId: actor.id,
            message: `Actor "${actor.name}" in module "${mod.name}" is not referenced by any workflow authorization`,
            suggestion: 'Connect this actor to workflows or remove it',
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
  readonly [key: string]: unknown;
}

function getNodeArray(mod: ModuleNode, category: string): readonly NamedNode[] {
  const val = mod[category];
  if (!Array.isArray(val)) return [];
  return val as readonly NamedNode[];
}

function getStringArray(node: NamedNode, key: string): readonly string[] {
  const val = node[key];
  if (!Array.isArray(val)) return [];
  return val as readonly string[];
}
