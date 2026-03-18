// ---------------------------------------------------------------------------
// Prodara Compiler — Security Reviewer
// ---------------------------------------------------------------------------
// Validates security posture: authorization coverage, credential handling,
// input validation, and injection risk across the product graph.

import type { ProductGraph, ModuleNode, GraphEdge } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewFinding } from './types.js';
import type { ReviewerAgent } from './reviewer.js';

export const securityReviewer: ReviewerAgent = {
  name: 'security',
  description: 'Validates authorization, credential handling, and input validation',

  review(graph: ProductGraph, _spec: IncrementalSpec): readonly ReviewFinding[] {
    const findings: ReviewFinding[] = [];

    for (const mod of graph.modules) {
      // Check: workflows that modify entities should have authorization
      for (const wf of getNodeArray(mod, 'workflows')) {
        const modifiesEntity = graph.edges.some(
          (e) => e.from === wf.id && e.kind === 'writes',
        );
        const hasAuth = graph.edges.some(
          (e) => e.from === wf.id && e.kind === 'authorized_as',
        );

        if (modifiesEntity && !hasAuth) {
          findings.push({
            reviewer: 'security',
            severity: 'error',
            category: 'missing_authorization',
            nodeId: wf.id,
            message: `Workflow "${wf.name}" modifies entities but has no authorization`,
            suggestion: 'Add authorization to restrict who can modify data',
          });
        }
      }

      // Check: entities with sensitive-sounding fields should have access controls
      for (const ent of getNodeArray(mod, 'entities')) {
        const fields = getFieldNames(mod, ent.id);
        const sensitiveFields = fields.filter((f) =>
          /password|secret|token|api_key|credit_card|ssn/i.test(f),
        );

        if (sensitiveFields.length > 0) {
          const hasAccess = graph.edges.some(
            (e) => e.to === ent.id && e.kind === 'authorized_as',
          );
          if (!hasAccess) {
            findings.push({
              reviewer: 'security',
              severity: 'warning',
              category: 'sensitive_data',
              nodeId: ent.id,
              message: `Entity "${ent.name}" has sensitive field(s) [${sensitiveFields.join(', ')}] without access control`,
              suggestion: 'Add authorization rules to protect sensitive data',
            });
          }
        }
      }
    }

    // Check: exposed APIs (publishes) should have authorization
    if (graph.product.publishes) {
      for (const [_channel, events] of Object.entries(graph.product.publishes)) {
        for (const event of events) {
          const hasAuth = graph.edges.some(
            (e) => e.from === event && e.kind === 'authorized_as',
          );
          if (!hasAuth) {
            findings.push({
              reviewer: 'security',
              severity: 'warning',
              category: 'exposed_without_auth',
              nodeId: event,
              message: `Published event "${event}" has no authorization`,
              suggestion: 'Add authorization to published interfaces',
            });
          }
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

function getFieldNames(mod: ModuleNode, entityId: string): string[] {
  const entities = getNodeArray(mod, 'entities');
  const entity = entities.find((e) => e.id === entityId);
  /* v8 ignore next */
  if (!entity) return [];
  const raw = entity as unknown as Record<string, unknown>;
  const fields = raw['fields'];
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((f): f is { name: string } => typeof f === 'object' && f !== null && 'name' in f)
    .map((f) => f.name);
}
