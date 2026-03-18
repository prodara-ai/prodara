// ---------------------------------------------------------------------------
// Tests — Git Helpers
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isGitRepo, hasChanges, autoCommit } from '../src/cli/git.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'prodara-git-'));
}

function makeTempGitRepo(): string {
  const dir = makeTempDir();
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  // Create initial commit so the repo is valid
  writeFileSync(join(dir, 'init.txt'), 'init');
  execSync('git add . && git commit -m "init"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

describe('Git Helpers', () => {
  it('isGitRepo returns false for non-git directory', () => {
    const dir = makeTempDir();
    expect(isGitRepo(dir)).toBe(false);
  });

  it('isGitRepo returns true for git directory', () => {
    const dir = makeTempGitRepo();
    expect(isGitRepo(dir)).toBe(true);
  });

  it('hasChanges returns false for non-git directory', () => {
    const dir = makeTempDir();
    expect(hasChanges(dir)).toBe(false);
  });

  it('hasChanges returns false for clean git repo', () => {
    const dir = makeTempGitRepo();
    expect(hasChanges(dir)).toBe(false);
  });

  it('hasChanges returns true for dirty git repo', () => {
    const dir = makeTempGitRepo();
    writeFileSync(join(dir, 'new.txt'), 'change');
    expect(hasChanges(dir)).toBe(true);
  });

  it('autoCommit returns null for non-git directory', () => {
    const dir = makeTempDir();
    expect(autoCommit(dir, 'TestApp', 1)).toBeNull();
  });

  it('autoCommit returns null for clean git repo', () => {
    const dir = makeTempGitRepo();
    expect(autoCommit(dir, 'TestApp', 1)).toBeNull();
  });

  it('autoCommit creates commit and returns hash', () => {
    const dir = makeTempGitRepo();
    writeFileSync(join(dir, 'app.prd'), 'product test {}');
    const hash = autoCommit(dir, 'TestApp', 3);

    expect(hash).not.toBeNull();
    expect(hash!.length).toBeGreaterThan(0);

    // Verify the commit message
    const msg = execSync('git log -1 --format=%s', { cwd: dir, encoding: 'utf-8' }).trim();
    expect(msg).toContain('TestApp');
    expect(msg).toContain('3 changes');
  });

  it('autoCommit uses singular "change" for count 1', () => {
    const dir = makeTempGitRepo();
    writeFileSync(join(dir, 'app.prd'), 'product test {}');
    autoCommit(dir, 'TestApp', 1);

    const msg = execSync('git log -1 --format=%s', { cwd: dir, encoding: 'utf-8' }).trim();
    expect(msg).toContain('1 change]');
  });
});
