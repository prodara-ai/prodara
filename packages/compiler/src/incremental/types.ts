// ---------------------------------------------------------------------------
// Prodara Compiler — Incremental Spec Types
// ---------------------------------------------------------------------------
// The IncrementalSpec is the structured artifact produced after graph diffing.
// It bridges the compilation pipeline with the workflow phase engine.

import type { NodeChange, ImpactEntry, PlanTask } from '../planner/plan-types.js';
import type { GraphSlice, SliceCategory } from '../generator/contracts.js';

// ---------------------------------------------------------------------------
// Incremental Spec envelope
// ---------------------------------------------------------------------------

export interface IncrementalSpec {
  readonly format: 'prodara-incremental-spec';
  readonly version: '0.1.0';
  readonly summary: IncrementalSpecSummary;
  readonly changes: readonly NodeChangeDetail[];
  readonly impacts: readonly ImpactDetail[];
  readonly tasks: readonly PlanTask[];
  readonly slices: Readonly<Record<SliceCategory, GraphSlice>>;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface IncrementalSpecSummary {
  readonly addedCount: number;
  readonly removedCount: number;
  readonly modifiedCount: number;
  readonly impactedCount: number;
  readonly taskCount: number;
  readonly affectedModules: readonly string[];
}

// ---------------------------------------------------------------------------
// Enriched change/impact entries
// ---------------------------------------------------------------------------

export interface NodeChangeDetail extends NodeChange {
  readonly nodeKind: string;
  readonly module: string;
}

export interface ImpactDetail extends ImpactEntry {
  readonly nodeKind: string;
  readonly module: string;
}
