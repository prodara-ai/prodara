// ---------------------------------------------------------------------------
// Prodara Compiler — Proposal Operations
// ---------------------------------------------------------------------------
// Core logic for creating, listing, applying, and archiving change proposals.

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { ChangeMetadata, ChangeProposal, ChangeStatus } from './types.js';

export const CHANGES_DIR = '.prodara/changes';
export const ARCHIVE_DIR = '.prodara/changes/archive';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createProposal(description: string, root: string): ChangeProposal {
  const name = slugify(description);
  const changesDir = join(root, CHANGES_DIR);
  const proposalDir = join(changesDir, name);

  if (existsSync(proposalDir)) {
    throw new Error(`Change proposal already exists: ${name}`);
  }

  mkdirSync(proposalDir, { recursive: true });

  const metadata: ChangeMetadata = {
    name,
    description,
    status: 'proposed',
    created: new Date().toISOString(),
  };

  // Write metadata
  writeFileSync(
    join(proposalDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2) + '\n',
    'utf-8',
  );

  // Write proposal markdown
  writeFileSync(
    join(proposalDir, 'proposal.md'),
    [
      `# ${description}`,
      '',
      '## Summary',
      '',
      'Describe the change and its motivation here.',
      '',
      '## Scope',
      '',
      '- Affected modules:',
      '- New entities/workflows:',
      '- Modified entities/workflows:',
      '',
    ].join('\n'),
    'utf-8',
  );

  // Write delta.prd template
  writeFileSync(
    join(proposalDir, 'delta.prd'),
    [
      `// Delta specification for: ${description}`,
      '// This file is compiled alongside your main .prd files.',
      '// Add new or modified entity, workflow, surface, and event blocks below.',
      '//',
      '// Example:',
      '//   entity new_feature {',
      '//     id: uuid',
      '//     name: string',
      '//   }',
      '',
    ].join('\n'),
    'utf-8',
  );

  // Write task checklist
  writeFileSync(
    join(proposalDir, 'tasks.md'),
    [
      `# Tasks — ${description}`,
      '',
      '- [ ] Define delta specification (delta.prd)',
      '- [ ] Run `prodara validate` on delta',
      '- [ ] Review semantic diff',
      '- [ ] Implement changes',
      '- [ ] Archive proposal',
      '',
    ].join('\n'),
    'utf-8',
  );

  return {
    name,
    description,
    status: 'proposed',
    created: metadata.created,
    path: proposalDir,
  };
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function listProposals(root: string): ChangeProposal[] {
  const changesDir = join(root, CHANGES_DIR);
  if (!existsSync(changesDir)) return [];

  const entries = readdirSync(changesDir, { withFileTypes: true });
  const proposals: ChangeProposal[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;

    const metadataPath = join(changesDir, entry.name, 'metadata.json');
    /* v8 ignore next -- defensive: metadata always exists for valid proposals */
    if (!existsSync(metadataPath)) continue;

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as ChangeMetadata;
    proposals.push({
      name: metadata.name,
      description: metadata.description,
      status: metadata.status,
      created: metadata.created,
      path: join(changesDir, entry.name),
    });
  }

  return proposals.sort((a, b) => b.created.localeCompare(a.created));
}

// ---------------------------------------------------------------------------
// Get
// ---------------------------------------------------------------------------

export function getProposal(name: string, root: string): ChangeProposal | null {
  const changesDir = join(root, CHANGES_DIR);
  const proposalDir = join(changesDir, name);
  const metadataPath = join(proposalDir, 'metadata.json');

  if (!existsSync(metadataPath)) return null;

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as ChangeMetadata;
  return {
    name: metadata.name,
    description: metadata.description,
    status: metadata.status,
    created: metadata.created,
    path: proposalDir,
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

export function applyProposal(name: string, root: string): ChangeProposal {
  const proposal = getProposal(name, root);
  if (!proposal) {
    throw new Error(`Change proposal not found: ${name}`);
  }

  // Update status to in-progress
  updateStatus(proposal.path, 'in-progress');

  return { ...proposal, status: 'in-progress' };
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

export function archiveProposal(name: string, root: string): ChangeProposal {
  const proposal = getProposal(name, root);
  if (!proposal) {
    throw new Error(`Change proposal not found: ${name}`);
  }

  const archiveDir = join(root, ARCHIVE_DIR);
  mkdirSync(archiveDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const archiveName = `${date}-${name}`;
  const archivePath = join(archiveDir, archiveName);

  // Update status before moving
  updateStatus(proposal.path, 'archived');

  // Move to archive
  renameSync(proposal.path, archivePath);

  return { ...proposal, status: 'archived', path: archivePath };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateStatus(proposalPath: string, status: ChangeStatus): void {
  const metadataPath = join(proposalPath, 'metadata.json');
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as ChangeMetadata;
  const updated: ChangeMetadata = { ...metadata, status };
  writeFileSync(metadataPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
