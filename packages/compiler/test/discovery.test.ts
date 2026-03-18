import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverFiles } from '../src/discovery/discovery.js';

describe('Discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('finds .prd files in root', () => {
    writeFileSync(join(tempDir, 'app.prd'), 'product x {}');
    writeFileSync(join(tempDir, 'billing.prd'), 'module billing {}');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(2);
    expect(files[0]!).toContain('app.prd');
    expect(files[1]!).toContain('billing.prd');
  });

  it('finds .prd files recursively', () => {
    mkdirSync(join(tempDir, 'sub'));
    writeFileSync(join(tempDir, 'app.prd'), 'product x {}');
    writeFileSync(join(tempDir, 'sub', 'module.prd'), 'module sub {}');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(2);
  });

  it('returns sorted paths', () => {
    writeFileSync(join(tempDir, 'c.prd'), '');
    writeFileSync(join(tempDir, 'a.prd'), '');
    writeFileSync(join(tempDir, 'b.prd'), '');
    const files = discoverFiles(tempDir);
    expect(files).toEqual([...files].sort());
  });

  it('ignores non-.prd files', () => {
    writeFileSync(join(tempDir, 'app.prd'), '');
    writeFileSync(join(tempDir, 'readme.md'), '');
    writeFileSync(join(tempDir, 'config.json'), '');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(1);
  });

  it('skips hidden directories', () => {
    mkdirSync(join(tempDir, '.hidden'));
    writeFileSync(join(tempDir, '.hidden', 'secret.prd'), '');
    writeFileSync(join(tempDir, 'app.prd'), '');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(1);
  });

  it('skips node_modules', () => {
    mkdirSync(join(tempDir, 'node_modules'));
    writeFileSync(join(tempDir, 'node_modules', 'pkg.prd'), '');
    writeFileSync(join(tempDir, 'app.prd'), '');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(1);
  });

  it('skips dist directory', () => {
    mkdirSync(join(tempDir, 'dist'));
    writeFileSync(join(tempDir, 'dist', 'out.prd'), '');
    writeFileSync(join(tempDir, 'app.prd'), '');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(1);
  });

  it('returns empty for empty directory', () => {
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(0);
  });

  it('handles non-existent directory gracefully', () => {
    const files = discoverFiles(join(tempDir, 'nonexistent'));
    expect(files).toHaveLength(0);
  });

  it('skips unreadable directory entries (broken symlinks)', () => {
    writeFileSync(join(tempDir, 'good.prd'), 'product x {}');
    // Create a broken symlink — lstatSync will detect it as a symlink and skip
    symlinkSync(join(tempDir, 'does_not_exist'), join(tempDir, 'broken_link'));
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(1);
    expect(files[0]!).toContain('good.prd');
  });

  it('skips symlinked directories to prevent cycles', () => {
    mkdirSync(join(tempDir, 'real'));
    writeFileSync(join(tempDir, 'real', 'inner.prd'), 'module inner {}');
    // Create a symlink to the real directory — should be skipped
    symlinkSync(join(tempDir, 'real'), join(tempDir, 'linked'));
    writeFileSync(join(tempDir, 'app.prd'), 'product x {}');
    const files = discoverFiles(tempDir);
    // Should only find app.prd and real/inner.prd — not linked/inner.prd
    expect(files).toHaveLength(2);
  });

  it('respects max depth limit', () => {
    // Create nested structure 3 levels deep
    mkdirSync(join(tempDir, 'a', 'b', 'c'), { recursive: true });
    writeFileSync(join(tempDir, 'a', 'top.prd'), '');
    writeFileSync(join(tempDir, 'a', 'b', 'mid.prd'), '');
    writeFileSync(join(tempDir, 'a', 'b', 'c', 'deep.prd'), '');
    // With maxDepth=1, should only reach first level of subdirectories
    const files = discoverFiles(tempDir, 1);
    expect(files).toHaveLength(1);
    expect(files[0]!).toContain('top.prd');
  });

  it('uses default max depth for very deep trees', () => {
    // Just verify the function works with default depth parameter
    writeFileSync(join(tempDir, 'app.prd'), '');
    const files = discoverFiles(tempDir);
    expect(files).toHaveLength(1);
  });
});
