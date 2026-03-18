// ---------------------------------------------------------------------------
// Prodara Compiler — Change Proposal System
// ---------------------------------------------------------------------------
// Manages formal change proposals in .prodara/changes/. Each proposal
// contains a delta.prd file that gets full compilation and type checking.

export type { ChangeStatus, ChangeProposal, ChangeMetadata } from './types.js';
export { createProposal, listProposals, applyProposal, archiveProposal, getProposal, CHANGES_DIR, ARCHIVE_DIR } from './proposal.js';
