// ---------------------------------------------------------------------------
// Prodara Compiler — Reviewer Types
// ---------------------------------------------------------------------------

import type { AgentStatus } from '../agent/types.js';

export type FindingSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ReviewFinding {
  readonly reviewer: string;
  readonly severity: FindingSeverity;
  readonly category: string;
  readonly nodeId?: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface ReviewResult {
  readonly reviewer: string;
  readonly passed: boolean;
  readonly findings: readonly ReviewFinding[];
}

export interface FixAttemptResult {
  readonly iteration: number;
  readonly status: AgentStatus;
  readonly findingsAddressed: number;
  readonly duration_ms: number;
}

export interface ReviewCycleResult {
  readonly iteration: number;
  readonly results: readonly ReviewResult[];
  readonly accepted: boolean;
  readonly totalFindings: number;
  readonly criticalCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly fixAttempt: FixAttemptResult | null;
}
