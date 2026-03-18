// ---------------------------------------------------------------------------
// Prodara Compiler — Governance Types
// ---------------------------------------------------------------------------

export interface GovernanceFile {
  readonly path: string;
  readonly content: string;
}

export interface GovernanceRule {
  readonly category: 'convention' | 'constraint' | 'preference';
  readonly rule: string;
}

export interface GovernanceContext {
  readonly techStack: readonly string[];
  readonly conventions: readonly GovernanceRule[];
  readonly testingPatterns: readonly string[];
}
