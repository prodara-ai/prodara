// ---------------------------------------------------------------------------
// Tests — Change Proposal System
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProposal,
  listProposals,
  applyProposal,
  archiveProposal,
  getProposal,
} from '../src/proposal/proposal.js';
import { mkdtempSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'prodara-proposal-'));
  mkdirSync(join(dir, '.prodara'), { recursive: true });
  return dir;
}

describe('Proposal System', () => {
  let root: string;

  beforeEach(() => {
    root = makeTempDir();
  });

  describe('createProposal', () => {
    it('creates proposal directory with all files', () => {
      const proposal = createProposal('Add user authentication', root);
      expect(proposal.name).toBe('add-user-authentication');
      expect(proposal.status).toBe('proposed');
      expect(existsSync(join(proposal.path, 'metadata.json'))).toBe(true);
      expect(existsSync(join(proposal.path, 'proposal.md'))).toBe(true);
      expect(existsSync(join(proposal.path, 'delta.prd'))).toBe(true);
      expect(existsSync(join(proposal.path, 'tasks.md'))).toBe(true);
    });

    it('generates correct slug from description', () => {
      const proposal = createProposal('Add OAuth 2.0 Support!', root);
      expect(proposal.name).toBe('add-oauth-20-support');
    });

    it('throws on duplicate proposal name', () => {
      createProposal('Add feature', root);
      expect(() => createProposal('Add feature', root)).toThrow('already exists');
    });

    it('stores correct metadata', () => {
      const proposal = createProposal('New billing module', root);
      const metadata = JSON.parse(readFileSync(join(proposal.path, 'metadata.json'), 'utf-8'));
      expect(metadata.name).toBe('new-billing-module');
      expect(metadata.description).toBe('New billing module');
      expect(metadata.status).toBe('proposed');
      expect(metadata.created).toBeDefined();
    });

    it('creates delta.prd with comment header', () => {
      const proposal = createProposal('Add teams', root);
      const delta = readFileSync(join(proposal.path, 'delta.prd'), 'utf-8');
      expect(delta).toContain('Delta specification for: Add teams');
    });

    it('creates tasks.md with checklist', () => {
      const proposal = createProposal('Add teams', root);
      const tasks = readFileSync(join(proposal.path, 'tasks.md'), 'utf-8');
      expect(tasks).toContain('- [ ] Define delta specification');
      expect(tasks).toContain('- [ ] Run `prodara validate`');
    });
  });

  describe('listProposals', () => {
    it('returns empty array when no proposals exist', () => {
      const proposals = listProposals(root);
      expect(proposals).toHaveLength(0);
    });

    it('lists active proposals', () => {
      createProposal('First change', root);
      createProposal('Second change', root);
      const proposals = listProposals(root);
      expect(proposals).toHaveLength(2);
    });

    it('does not list archived proposals', () => {
      createProposal('To archive', root);
      archiveProposal('to-archive', root);
      const proposals = listProposals(root);
      expect(proposals).toHaveLength(0);
    });

    it('returns proposals with name and status', () => {
      createProposal('First', root);
      createProposal('Second', root);
      const proposals = listProposals(root);
      const names = proposals.map(p => p.name).sort();
      expect(names).toEqual(['first', 'second']);
      expect(proposals.every(p => p.status === 'proposed')).toBe(true);
    });
  });

  describe('getProposal', () => {
    it('returns proposal by name', () => {
      createProposal('My feature', root);
      const proposal = getProposal('my-feature', root);
      expect(proposal).toBeDefined();
      expect(proposal!.name).toBe('my-feature');
      expect(proposal!.status).toBe('proposed');
    });

    it('returns null for non-existent proposal', () => {
      const proposal = getProposal('non-existent', root);
      expect(proposal).toBeNull();
    });
  });

  describe('applyProposal', () => {
    it('updates status to in-progress', () => {
      createProposal('Apply me', root);
      const result = applyProposal('apply-me', root);
      expect(result.status).toBe('in-progress');

      // Verify persisted
      const metadata = JSON.parse(readFileSync(join(result.path, 'metadata.json'), 'utf-8'));
      expect(metadata.status).toBe('in-progress');
    });

    it('throws for non-existent proposal', () => {
      expect(() => applyProposal('nope', root)).toThrow('not found');
    });
  });

  describe('archiveProposal', () => {
    it('moves proposal to archive directory', () => {
      createProposal('Archive me', root);
      const result = archiveProposal('archive-me', root);
      expect(result.status).toBe('archived');
      expect(result.path).toContain('archive');
      expect(existsSync(result.path)).toBe(true);

      // Original location should be gone
      const original = getProposal('archive-me', root);
      expect(original).toBeNull();
    });

    it('throws for non-existent proposal', () => {
      expect(() => archiveProposal('nope', root)).toThrow('not found');
    });
  });

  describe('round-trip', () => {
    it('propose → apply → archive lifecycle', () => {
      // Create
      const created = createProposal('Full lifecycle', root);
      expect(created.status).toBe('proposed');

      // Apply
      const applied = applyProposal('full-lifecycle', root);
      expect(applied.status).toBe('in-progress');

      // Archive
      const archived = archiveProposal('full-lifecycle', root);
      expect(archived.status).toBe('archived');

      // Verify no active proposals remain
      const remaining = listProposals(root);
      expect(remaining).toHaveLength(0);
    });
  });
});
