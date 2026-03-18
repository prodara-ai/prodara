// ---------------------------------------------------------------------------
// Prodara Compiler — Audit Types
// ---------------------------------------------------------------------------

export type AuditPhaseStatus = 'ok' | 'warn' | 'error' | 'skipped';

export interface AuditPhase {
  readonly name: string;
  readonly status: AuditPhaseStatus;
  readonly duration_ms: number;
  readonly metrics: Record<string, number>;
}

export type AuditOutcome = 'success' | 'failed' | 'partial' | 'blocked';

export interface AuditBlocker {
  readonly phase: string;
  readonly reason: string;
  readonly impact: string;
  readonly resolution: string;
}

export interface AuditRecord {
  readonly timestamp: string;
  readonly compiler_version: string;
  readonly spec_summary: string;
  readonly config_options: Record<string, unknown>;
  readonly phases: readonly AuditPhase[];
  readonly outcome: AuditOutcome;
  readonly blocker: AuditBlocker | null;
  readonly files_changed: readonly string[];
}
