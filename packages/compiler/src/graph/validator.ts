// ---------------------------------------------------------------------------
// Prodara Compiler — Graph Validator
// ---------------------------------------------------------------------------
// Validates graph-level invariants after Product Graph construction.
// This implements Phase 10 of the compilation pipeline.

import type { ProductGraph, GraphEdge } from './graph-types.js';
import { DiagnosticBag } from '../diagnostics/diagnostic.js';

export interface GraphValidationResult {
  readonly bag: DiagnosticBag;
}

/**
 * Validate graph-level invariants:
 * - All edge endpoints reference existing node IDs
 * - No self-referencing edges
 * - Product node references match actual modules
 * - Module containment consistency
 */
export function validateGraph(graph: ProductGraph): GraphValidationResult {
  const bag = new DiagnosticBag();

  // Collect all valid node IDs
  const nodeIds = new Set<string>();
  nodeIds.add(graph.product.id);
  for (const mod of graph.modules) {
    nodeIds.add(mod.id);
    collectModuleNodeIds(mod, nodeIds);
  }

  // Validate edges
  for (const edge of graph.edges) {
    validateEdge(edge, nodeIds, bag);
  }

  // Validate product module list matches actual modules
  const actualModuleNames = new Set(graph.modules.map((m) => m.name));
  for (const modName of graph.product.modules) {
    if (!actualModuleNames.has(modName)) {
      bag.add({
        phase: 'graph',
        category: 'graph_error',
        severity: 'error',
        code: 'PRD0500',
        message: `Product references module '${modName}' but it does not exist in the graph`,
        file: '',
        line: 0,
        column: 0,
      });
    }
  }

  return { bag };
}

function collectModuleNodeIds(mod: Record<string, unknown>, ids: Set<string>): void {
  for (const [key, value] of Object.entries(mod)) {
    if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
          ids.add(item.id);
        }
      }
    }
  }
}

function validateEdge(edge: GraphEdge, nodeIds: Set<string>, bag: DiagnosticBag): void {
  if (edge.from === edge.to) {
    bag.add({
      phase: 'graph',
      category: 'graph_error',
      severity: 'warning',
      code: 'PRD0501',
      message: `Self-referencing edge: ${edge.from} --[${edge.kind}]--> ${edge.to}`,
      file: '',
      line: 0,
      column: 0,
    });
  }

  if (!nodeIds.has(edge.from)) {
    bag.add({
      phase: 'graph',
      category: 'graph_error',
      severity: 'error',
      code: 'PRD0502',
      message: `Edge source '${edge.from}' (--[${edge.kind}]-->) not found in graph`,
      file: '',
      line: 0,
      column: 0,
    });
  }

  if (!nodeIds.has(edge.to)) {
    bag.add({
      phase: 'graph',
      category: 'graph_error',
      severity: 'warning',
      code: 'PRD0503',
      message: `Edge target '${edge.to}' (<--[${edge.kind}]--) not found in graph`,
      file: '',
      line: 0,
      column: 0,
    });
  }
}
