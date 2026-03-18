// ---------------------------------------------------------------------------
// Prodara Compiler — Verification Types
// ---------------------------------------------------------------------------

export type VerificationSeverity = 'pass' | 'fail' | 'warn';

export interface VerificationCheck {
  readonly name: string;
  readonly severity: VerificationSeverity;
  readonly message: string;
}

export interface VerificationResult {
  readonly passed: boolean;
  readonly checks: readonly VerificationCheck[];
  readonly passCount: number;
  readonly failCount: number;
  readonly warnCount: number;
}
