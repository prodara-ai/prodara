// ---------------------------------------------------------------------------
// Prodara Compiler — Incremental Spec Module Barrel
// ---------------------------------------------------------------------------

export { buildIncrementalSpec, serializeIncrementalSpec } from './incremental-spec.js';

export type {
  IncrementalSpec,
  IncrementalSpecSummary,
  NodeChangeDetail,
  ImpactDetail,
} from './types.js';
