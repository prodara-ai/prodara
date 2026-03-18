// ---------------------------------------------------------------------------
// Prodara Compiler — Validation Types
// ---------------------------------------------------------------------------

export type ValidationStatus = 'passed' | 'failed' | 'skipped' | 'timeout';

export type ValidationStep = 'lint' | 'typecheck' | 'test' | 'build';

export interface ValidationCommandResult {
  readonly step: ValidationStep;
  readonly command: string;
  readonly status: ValidationStatus;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly duration_ms: number;
}

export interface ValidationResult {
  readonly passed: boolean;
  readonly results: readonly ValidationCommandResult[];
}
