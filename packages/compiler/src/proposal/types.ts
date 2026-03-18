// ---------------------------------------------------------------------------
// Prodara Compiler — Proposal Types
// ---------------------------------------------------------------------------

export type ChangeStatus = 'proposed' | 'in-progress' | 'implemented' | 'archived';

export interface ChangeMetadata {
  readonly name: string;
  readonly description: string;
  readonly status: ChangeStatus;
  readonly created: string;
}

export interface ChangeProposal {
  readonly name: string;
  readonly description: string;
  readonly status: ChangeStatus;
  readonly created: string;
  readonly path: string;
}
