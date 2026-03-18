// ---------------------------------------------------------------------------
// Prodara Compiler — Spec Drift Detection
// ---------------------------------------------------------------------------
// Compares current .prd sources against the stored build state to detect
// whether the specification has drifted from the last successful build.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { discoverFiles } from '../discovery/discovery.js';
import type { BuildState } from '../build-state/build-state.js';

const BUILD_DIR = '.prodara';
const BUILD_FILE = 'build.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriftStatus = 'clean' | 'drifted' | 'no-build';

export interface DriftFile {
  readonly path: string;
  readonly status: 'added' | 'removed' | 'modified';
}

export interface DriftResult {
  readonly status: DriftStatus;
  readonly files: readonly DriftFile[];
  readonly currentSourceHash: string;
  readonly previousSourceHash: string | null;
  readonly lastCompiled: string | null;
  readonly summary: string;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function detectDrift(root: string): DriftResult {
  const buildStatePath = join(root, BUILD_DIR, BUILD_FILE);

  // If no build state exists, report as no-build
  if (!existsSync(buildStatePath)) {
    const sourceFiles = discoverFiles(root);
    const currentHash = hashFilePaths(sourceFiles);
    return {
      status: 'no-build',
      files: [],
      currentSourceHash: currentHash,
      previousSourceHash: null,
      lastCompiled: null,
      summary: 'No previous build found. Run `prodara build` first.',
    };
  }

  const buildState = JSON.parse(
    readFileSync(buildStatePath, 'utf-8'),
  ) as BuildState;

  const sourceFiles = discoverFiles(root);
  const currentHash = hashFilePaths(sourceFiles);

  if (currentHash === buildState.sourceHash) {
    return {
      status: 'clean',
      files: [],
      currentSourceHash: currentHash,
      previousSourceHash: buildState.sourceHash,
      lastCompiled: buildState.lastCompiled,
      summary: `Specification is clean (last built: ${buildState.lastCompiled}).`,
    };
  }

  // Hash differs — figure out which files changed
  const driftFiles = identifyDriftedFiles(root, sourceFiles);

  const parts: string[] = [];
  const added = driftFiles.filter(f => f.status === 'added').length;
  const removed = driftFiles.filter(f => f.status === 'removed').length;
  const modified = driftFiles.filter(f => f.status === 'modified').length;
  if (added > 0) parts.push(`${added} added`);
  if (removed > 0) parts.push(`${removed} removed`);
  if (modified > 0) parts.push(`${modified} modified`);

  return {
    status: 'drifted',
    files: driftFiles,
    currentSourceHash: currentHash,
    previousSourceHash: buildState.sourceHash,
    lastCompiled: buildState.lastCompiled,
    summary: `Specification has drifted since last build (${parts.join(', ')}).`,
  };
}

// ---------------------------------------------------------------------------
// Human formatting
// ---------------------------------------------------------------------------

export function formatDriftHuman(result: DriftResult): string {
  const lines: string[] = [];
  lines.push(`Drift Status: ${result.status}`);
  lines.push(`  ${result.summary}`);

  if (result.files.length > 0) {
    lines.push('');
    lines.push('Changed files:');
    for (const f of result.files) {
      const icon = f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~';
      lines.push(`  ${icon} ${f.path}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hash a list of file paths in the same way build-state does.
 * Uses SHA-256 over file contents.
 */
function hashFilePaths(paths: readonly string[]): string {
  const h = createHash('sha256');
  for (const p of [...paths].sort()) {
    try {
      h.update(readFileSync(p, 'utf-8'));
    /* v8 ignore next 3 -- race condition: file removed between discovery and hashing */
    } catch {
      // File disappeared between discovery and hashing — skip
    }
  }
  return h.digest('hex');
}

/**
 * Build a per-file hash map and compare with a fresh hashing
 * to identify which files were added, removed, or modified.
 *
 * Since build state currently only stores an aggregate hash,
 * we detect additions/removals by checking file existence and
 * flag everything else as "modified" when the aggregate drifts.
 */
function identifyDriftedFiles(root: string, currentFiles: readonly string[]): DriftFile[] {
  // Read the recorded source file list if available
  const manifestPath = join(root, BUILD_DIR, 'sources.json');
  let previousFiles: readonly string[] = [];

  if (existsSync(manifestPath)) {
    try {
      previousFiles = JSON.parse(readFileSync(manifestPath, 'utf-8')) as string[];
    } catch {
      previousFiles = [];
    }
  }

  const driftFiles: DriftFile[] = [];
  const currentSet = new Set(currentFiles);
  const previousSet = new Set(previousFiles);

  // Added files (in current but not in previous)
  for (const f of currentFiles) {
    if (!previousSet.has(f)) {
      driftFiles.push({ path: f, status: 'added' });
    }
  }

  // Removed files (in previous but not in current)
  for (const f of previousFiles) {
    if (!currentSet.has(f)) {
      driftFiles.push({ path: f, status: 'removed' });
    }
  }

  // If we have no manifest but drift was detected, mark all as modified
  if (previousFiles.length === 0 && currentFiles.length > 0) {
    return currentFiles.map(f => ({ path: f, status: 'modified' as const }));
  }

  // Files present in both — mark as modified (aggregate hash already differs)
  if (driftFiles.length === 0) {
    // All same files but content differs — all are potentially modified
    for (const f of currentFiles) {
      driftFiles.push({ path: f, status: 'modified' });
    }
  }

  return driftFiles;
}
