// ---------------------------------------------------------------------------
// Prodara Compiler — Build Orchestration Types
// ---------------------------------------------------------------------------
// Defines the build run model and artifact manifest types for the
// orchestration layer. These mirror the .prodara/build.json and
// .prodara/artifacts.json formats from the spec.

import type { Plan } from '../planner/plan-types.js';
import type { ProductGraph } from '../graph/graph-types.js';
import type { SpecTestSuiteResult } from '../testing/test-runner.js';
import type { ConstitutionResolutionResult } from '../registry/resolution.js';

// ---------------------------------------------------------------------------
// Build Run
// ---------------------------------------------------------------------------

export type BuildStatus = 'success' | 'failed' | 'partial';

export interface BuildRun {
  readonly status: BuildStatus;
  readonly started_at: string;
  readonly finished_at: string;
  readonly compiler_version: string;
  readonly phases_completed: readonly string[];
  readonly file_count: number;
  readonly node_count: number;
  readonly edge_count: number;
  readonly error_count: number;
  readonly warning_count: number;
  readonly test_passed: number;
  readonly test_failed: number;
  readonly plan_task_count: number;
}

// ---------------------------------------------------------------------------
// Build Summary (for CLI output)
// ---------------------------------------------------------------------------

export interface BuildSummary {
  readonly status: BuildStatus;
  readonly phases: readonly PhaseSummary[];
  readonly build: BuildRun;
}

export interface PhaseSummary {
  readonly name: string;
  readonly status: 'ok' | 'warn' | 'error' | 'skipped';
  readonly detail: string;
}

// ---------------------------------------------------------------------------
// Artifact Manifest
// ---------------------------------------------------------------------------

export type ArtifactKind = 'source' | 'config' | 'schema' | 'test' | 'docs' | 'asset';

export interface ArtifactEntry {
  readonly path: string;
  readonly node_id: string;
  readonly generator: string;
  readonly kind: ArtifactKind;
  readonly content_hash: string;
  readonly seams: readonly SeamEntry[];
}

export interface SeamEntry {
  readonly id: string;
  readonly start_line: number;
  readonly end_line: number;
  readonly language: string;
}

export interface ArtifactManifest {
  readonly version: string;
  readonly generated_at: string;
  readonly artifacts: readonly ArtifactEntry[];
}

// ---------------------------------------------------------------------------
// Build Input (passed to orchestrate)
// ---------------------------------------------------------------------------

export interface BuildInput {
  readonly graph: ProductGraph;
  readonly plan: Plan;
  readonly testResults: SpecTestSuiteResult;
  readonly constitutions: ConstitutionResolutionResult;
  readonly fileCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
}
