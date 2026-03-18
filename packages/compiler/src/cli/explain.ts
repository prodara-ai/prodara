// ---------------------------------------------------------------------------
// Prodara CLI — Explain & Why Helpers
// ---------------------------------------------------------------------------
// Utilities for the `explain` and `why` debugging CLI commands.

import type { ProductGraph, GraphEdge } from '../graph/graph-types.js';
import { collectAllNodeIds } from '../graph/graph-types.js';

// ---------------------------------------------------------------------------
// explain
// ---------------------------------------------------------------------------

export interface NodeExplanation {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly module: string | null;
  readonly properties: Record<string, unknown>;
  readonly incomingEdges: readonly GraphEdge[];
  readonly outgoingEdges: readonly GraphEdge[];
}

export { collectAllNodeIds };

export function explainNode(graph: ProductGraph, nodeId: string): NodeExplanation | null {
  // Check product node
  if (nodeId === 'product') {
    return {
      id: 'product',
      kind: 'product',
      name: graph.product.name,
      module: null,
      properties: { ...graph.product },
      incomingEdges: graph.edges.filter(e => e.to === 'product'),
      outgoingEdges: graph.edges.filter(e => e.from === 'product'),
    };
  }

  // Search modules
  for (const mod of graph.modules) {
    if (mod.id === nodeId) {
      return {
        id: mod.id,
        kind: 'module',
        name: mod.name,
        module: null,
        properties: { name: mod.name, imports: mod.imports },
        incomingEdges: graph.edges.filter(e => e.to === mod.id),
        outgoingEdges: graph.edges.filter(e => e.from === mod.id),
      };
    }

    // Search nodes inside module
    for (const [category, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item) {
            const node = item as { id: string; kind: string; name: string; [k: string]: unknown };
            if (node.id === nodeId) {
              return {
                id: node.id,
                kind: node.kind,
                name: node.name,
                module: mod.name,
                properties: { ...node },
                incomingEdges: graph.edges.filter(e => e.to === node.id),
                outgoingEdges: graph.edges.filter(e => e.from === node.id),
              };
            }
          }
        }
      }
    }
  }

  return null;
}

export function formatExplanation(explanation: NodeExplanation): string {
  const lines: string[] = [];
  lines.push(`Node: ${explanation.id}`);
  lines.push(`  Kind: ${explanation.kind}`);
  lines.push(`  Name: ${explanation.name}`);
  if (explanation.module) {
    lines.push(`  Module: ${explanation.module}`);
  }

  // Show relevant properties (skip id, kind, name which are already shown)
  const skipKeys = new Set(['id', 'kind', 'name']);
  for (const [key, value] of Object.entries(explanation.properties)) {
    if (skipKeys.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        lines.push(`  ${key}:`);
        for (const item of value) {
          /* v8 ignore next -- items always have name or id */
          const itemName = (item as Record<string, unknown>)['name'] ?? (item as Record<string, unknown>)['id'] ?? JSON.stringify(item);
          lines.push(`    - ${itemName}`);
        }
      } else {
        lines.push(`  ${key}: ${value.join(', ')}`);
      }
    } else if (typeof value === 'object') {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`  ${key}: ${value}`);
    }
  }

  if (explanation.incomingEdges.length > 0) {
    lines.push(`  Incoming edges:`);
    for (const e of explanation.incomingEdges) {
      lines.push(`    ${e.from} --[${e.kind}]--> ${e.to}`);
    }
  }

  if (explanation.outgoingEdges.length > 0) {
    lines.push(`  Outgoing edges:`);
    for (const e of explanation.outgoingEdges) {
      lines.push(`    ${e.from} --[${e.kind}]--> ${e.to}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// why — diagnostic code reference
// ---------------------------------------------------------------------------

export interface DiagnosticCodeInfo {
  readonly code: string;
  readonly title: string;
  readonly phase: string;
  readonly severity: string;
  readonly description: string;
}

const DIAGNOSTIC_CATALOG: readonly DiagnosticCodeInfo[] = [
  // Lexer
  { code: 'PRD0001', title: 'Unexpected character', phase: 'lexer', severity: 'error', description: 'The lexer encountered a character that is not valid in any token position.' },
  { code: 'PRD0002', title: 'Unterminated string literal', phase: 'lexer', severity: 'error', description: 'A string literal was opened with a quote but never closed.' },
  { code: 'PRD0010', title: 'No .prd files found', phase: 'discovery', severity: 'error', description: 'No .prd specification files were found in the given directory.' },
  { code: 'PRD0011', title: 'Cannot read file', phase: 'discovery', severity: 'error', description: 'A .prd file was discovered but could not be read from disk.' },

  // Parser
  { code: 'PRD0100', title: 'Syntax error', phase: 'parser', severity: 'error', description: 'The parser expected a different token at this position. Check for missing braces, keywords, or punctuation.' },

  // Binder
  { code: 'PRD0200', title: 'Duplicate product declaration', phase: 'binder', severity: 'error', description: 'Multiple product declarations found. Only one product block is allowed per project.' },
  { code: 'PRD0201', title: 'Duplicate module declaration', phase: 'binder', severity: 'error', description: 'A module with this name is already declared. Module names must be unique.' },
  { code: 'PRD0202', title: 'Duplicate symbol in module', phase: 'binder', severity: 'error', description: 'A symbol (entity, workflow, enum, etc.) with this name already exists in the same module.' },
  { code: 'PRD0203', title: 'Import resolution failure', phase: 'binder', severity: 'error', description: 'An imported symbol could not be resolved. Check that the source module exists and exports the symbol.' },

  // Type checker
  { code: 'PRD0300', title: 'Type mismatch', phase: 'checker', severity: 'error', description: 'A type reference does not match the expected type at this position.' },
  { code: 'PRD0301', title: 'Unknown type reference', phase: 'checker', severity: 'error', description: 'A type reference could not be resolved. The referenced entity, enum, or type does not exist.' },
  { code: 'PRD0302', title: 'Invalid type usage', phase: 'checker', severity: 'error', description: 'A type is used in a position where it is not valid (e.g., using an enum where an entity is expected).' },

  // Validator
  { code: 'PRD0400', title: 'Validation error', phase: 'validator', severity: 'error', description: 'A general validation rule was violated. Check the specific message for details.' },
  { code: 'PRD0401', title: 'Missing required field', phase: 'validator', severity: 'error', description: 'A required field is missing from the declaration.' },
  { code: 'PRD0402', title: 'Invalid value', phase: 'validator', severity: 'error', description: 'A field value does not meet validation constraints.' },

  // Graph validator
  { code: 'PRD0500', title: 'Graph integrity error', phase: 'graph', severity: 'error', description: 'The product graph has an integrity issue (e.g., orphan node, missing edge target).' },
  { code: 'PRD0501', title: 'Orphan node', phase: 'graph', severity: 'warning', description: 'A node in the graph is not connected to any other node.' },
  { code: 'PRD0502', title: 'Dangling edge', phase: 'graph', severity: 'error', description: 'An edge references a node that does not exist in the graph.' },
  { code: 'PRD0503', title: 'Cycle detected', phase: 'graph', severity: 'warning', description: 'A dependency cycle was detected in the graph.' },

  // Registry
  { code: 'PRD0601', title: 'Constitution resolution error', phase: 'registry', severity: 'error', description: 'A referenced constitution package could not be resolved.' },

  // Testing
  { code: 'PRD0800', title: 'Test target not found', phase: 'testing', severity: 'error', description: 'A test references a node that does not exist in the compiled graph.' },
  { code: 'PRD0801', title: 'Test assertion failed', phase: 'testing', severity: 'error', description: 'A test assertion did not pass. Review the specific failure message.' },
];

export function getDiagnosticInfo(code: string): DiagnosticCodeInfo | null {
  const normalized = code.toUpperCase();
  return DIAGNOSTIC_CATALOG.find(d => d.code === normalized) ?? null;
}
