// ---------------------------------------------------------------------------
// Prodara Compiler — Core Types
// ---------------------------------------------------------------------------
// Shared type definitions used across all compiler subsystems.

/** Source location for diagnostics and tooling. */
export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/** All primitive type names recognised by the language. */
export const PRIMITIVE_TYPES = [
  'string',
  'integer',
  'decimal',
  'boolean',
  'uuid',
  'date',
  'datetime',
] as const;

export type PrimitiveTypeName = (typeof PRIMITIVE_TYPES)[number];

/** Discriminated union of all type expressions in the AST. */
export type TypeExpr =
  | { readonly kind: 'primitive'; readonly name: PrimitiveTypeName; readonly location: SourceLocation }
  | { readonly kind: 'ref'; readonly segments: readonly string[]; readonly location: SourceLocation }
  | { readonly kind: 'generic'; readonly wrapper: string; readonly inner: TypeExpr; readonly location: SourceLocation };

// ---------------------------------------------------------------------------
// Product Graph node kinds — mirrors the specification exactly.
// ---------------------------------------------------------------------------
export const NODE_KINDS = [
  'product',
  'module',
  'entity',
  'value',
  'enum',
  'rule',
  'actor',
  'capability',
  'workflow',
  'action',
  'event',
  'schedule',
  'surface',
  'rendering',
  'tokens',
  'theme',
  'strings',
  'serialization',
  'integration',
  'transport',
  'storage',
  'execution',
  'extension',
  'constitution',
  'security',
  'privacy',
  'validation',
  'secret',
  'environment',
  'deployment',
  'test',
  'product_ref',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

// ---------------------------------------------------------------------------
// Product Graph edge kinds — mirrors the specification exactly.
// ---------------------------------------------------------------------------
export const EDGE_KINDS = [
  'contains',
  'imports',
  'field_type',
  'input_type',
  'return_type',
  'payload_type',
  'contract_type',
  'reads',
  'writes',
  'uses_rule',
  'calls',
  'transitions',
  'triggers_on',
  'emits',
  'notifies',
  'invokes',
  'binds',
  'exposes_action',
  'contains_surface',
  'uses_serialization',
  'targets_surface',
  'uses_token',
  'extends_tokens',
  'references_string',
  'refines_entity',
  'refines_workflow',
  'refines_surface',
  'attaches_to',
  'uses_secret',
  'governs',
  'binds_secret',
  'includes_env',
  'tests',
  'authorized_as',
  'member_of',
  'product_dependency',
  'consumes_type',
  'consumes_event',
  'consumes_surface',
  'consumes_actor',
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

// ---------------------------------------------------------------------------
// Diagnostic severity and phases
// ---------------------------------------------------------------------------
export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export const DIAGNOSTIC_PHASES = [
  'lexer',
  'parser',
  'binder',
  'checker',
  'validator',
  'graph',
  'registry',
  'planner',
  'test_runner',
  'verifier',
] as const;

export type DiagnosticPhase = (typeof DIAGNOSTIC_PHASES)[number];

export const DIAGNOSTIC_CATEGORIES = [
  'lexical_error',
  'syntax_error',
  'resolution_error',
  'type_error',
  'semantic_error',
  'graph_error',
  'registry_error',
  'planning_error',
  'test_failure',
  'verification_error',
  'generation_error',
  'generation_warning',
  'seam_warning',
  'review_fix_error',
  'warning',
  'lint',
] as const;

export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[number];
