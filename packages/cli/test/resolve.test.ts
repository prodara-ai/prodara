// ---------------------------------------------------------------------------
// @prodara/cli – resolve.ts tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveLocal, parseSemver, checkVersionCompatibility } from '../src/resolve.js';

// ---------------------------------------------------------------------------
// resolveLocal
// ---------------------------------------------------------------------------

describe('resolveLocal', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'prodara-resolve-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns null when no compiler is installed', () => {
    expect(resolveLocal(tmp)).toBeNull();
  });

  it('finds local compiler with built CLI entry', () => {
    const pkgDir = join(tmp, 'node_modules', '@prodara', 'compiler');
    const cliEntry = join(pkgDir, 'dist', 'cli', 'main.js');
    mkdirSync(join(pkgDir, 'dist', 'cli'), { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@prodara/compiler', version: '1.2.3' }), 'utf-8');
    writeFileSync(cliEntry, '// cli', 'utf-8');

    const result = resolveLocal(tmp);
    expect(result).not.toBeNull();
    expect(result!.packageDir).toBe(pkgDir);
    expect(result!.version).toBe('1.2.3');
    expect(result!.cliEntry).toBe(cliEntry);
  });

  it('returns resolution with missing cliEntry when package exists but not built', () => {
    const pkgDir = join(tmp, 'node_modules', '@prodara', 'compiler');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@prodara/compiler', version: '0.5.0' }), 'utf-8');

    const result = resolveLocal(tmp);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('0.5.0');
  });

  it('walks up to parent directory', () => {
    const child = join(tmp, 'projects', 'myapp');
    mkdirSync(child, { recursive: true });
    const pkgDir = join(tmp, 'node_modules', '@prodara', 'compiler');
    const cliEntry = join(pkgDir, 'dist', 'cli', 'main.js');
    mkdirSync(join(pkgDir, 'dist', 'cli'), { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ version: '2.0.0' }), 'utf-8');
    writeFileSync(cliEntry, '// cli', 'utf-8');

    const result = resolveLocal(child);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('2.0.0');
  });

  it('skips corrupted package.json', () => {
    const pkgDir = join(tmp, 'node_modules', '@prodara', 'compiler');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), '{invalid json', 'utf-8');

    expect(resolveLocal(tmp)).toBeNull();
  });

  it('defaults version to 0.0.0 when missing', () => {
    const pkgDir = join(tmp, 'node_modules', '@prodara', 'compiler');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@prodara/compiler' }), 'utf-8');

    const result = resolveLocal(tmp);
    expect(result).not.toBeNull();
    expect(result!.version).toBe('0.0.0');
  });
});

// ---------------------------------------------------------------------------
// parseSemver
// ---------------------------------------------------------------------------

describe('parseSemver', () => {
  it('parses valid version', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
  });

  it('parses version with prerelease suffix', () => {
    expect(parseSemver('2.0.0-beta.1')).toEqual([2, 0, 0]);
  });

  it('returns [0,0,0] for invalid input', () => {
    expect(parseSemver('not-a-version')).toEqual([0, 0, 0]);
  });

  it('returns [0,0,0] for empty string', () => {
    expect(parseSemver('')).toEqual([0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// checkVersionCompatibility
// ---------------------------------------------------------------------------

describe('checkVersionCompatibility', () => {
  it('compatible when same major', () => {
    const result = checkVersionCompatibility('0.1.0', '0.1.0');
    expect(result.compatible).toBe(true);
  });

  it('compatible when local minor is higher', () => {
    const result = checkVersionCompatibility('0.1.0', '0.2.0');
    expect(result.compatible).toBe(true);
  });

  it('incompatible when major mismatch', () => {
    const result = checkVersionCompatibility('1.0.0', '2.0.0');
    expect(result.compatible).toBe(false);
    expect(result.message).toBeTruthy();
  });
});
