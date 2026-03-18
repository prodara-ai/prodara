// ---------------------------------------------------------------------------
// Prodara CLI — Git Helpers (Auto-Commit)
// ---------------------------------------------------------------------------

import { execSync } from 'node:child_process';

/**
 * Check if the working directory is inside a git repository.
 */
export function isGitRepo(cwd: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if there are uncommitted changes in the working tree.
 */
export function hasChanges(cwd: string): boolean {
  try {
    const status = execSync('git status --porcelain', { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Stage all changes and create a conventional commit.
 * Returns the commit hash on success, or null if nothing to commit.
 */
export function autoCommit(cwd: string, productName: string, changeCount: number): string | null {
  if (!isGitRepo(cwd)) return null;
  if (!hasChanges(cwd)) return null;

  const message = `chore(prodara): build ${productName} [${changeCount} change${changeCount !== 1 ? 's' : ''}]`;

  execSync('git add .', { cwd, stdio: 'pipe' });
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd, stdio: 'pipe' });

  const hash = execSync('git rev-parse --short HEAD', { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
  return hash;
}
