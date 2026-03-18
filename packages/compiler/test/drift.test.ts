import { describe, it, expect } from 'vitest';
import { detectDrift, formatDriftHuman } from '../src/drift/drift.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'prodara-drift-'));
  writeFileSync(join(dir, 'app.prd'), `
    product test_app {
      title: "Test App"
      version: "0.1.0"
      modules: [core]
    }
    module core { entity item { id: uuid } }
  `);
  return dir;
}

describe('Drift Detection', () => {
  it('reports no-build when no .prodara directory exists', () => {
    const dir = createTempProject();
    const result = detectDrift(dir);

    expect(result.status).toBe('no-build');
    expect(result.previousSourceHash).toBeNull();
    expect(result.lastCompiled).toBeNull();
    expect(result.summary).toContain('No previous build');
  });

  it('reports clean when hashes match', () => {
    const dir = createTempProject();

    // Simulate a build state with matching hash
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });

    // Compute the same hash
    const { createHash } = require('node:crypto');
    const { readFileSync, readdirSync } = require('node:fs');
    const files = readdirSync(dir)
      .filter((f: string) => f.endsWith('.prd'))
      .map((f: string) => join(dir, f))
      .sort();
    const h = createHash('sha256');
    for (const f of files) {
      h.update(readFileSync(f, 'utf-8'));
    }
    const hash = h.digest('hex');

    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: hash,
      graphHash: 'test',
      checksum: 'test',
    }));

    const result = detectDrift(dir);
    expect(result.status).toBe('clean');
    expect(result.summary).toContain('clean');
  });

  it('reports drifted when content changes', () => {
    const dir = createTempProject();

    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash-that-does-not-match',
      graphHash: 'test',
      checksum: 'test',
    }));

    const result = detectDrift(dir);
    expect(result.status).toBe('drifted');
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('identifies added files with sources.json', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    // sources.json has no files, but current dir has app.prd => added
    writeFileSync(join(prodaraDir, 'sources.json'), JSON.stringify([]));

    const result = detectDrift(dir);
    expect(result.status).toBe('drifted');
    expect(result.files.some(f => f.status === 'modified' || f.status === 'added')).toBe(true);
  });

  it('identifies removed files with sources.json', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });

    const currentFiles = [join(dir, 'app.prd')];
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    // Include app.prd AND a previously existing file
    writeFileSync(join(prodaraDir, 'sources.json'), JSON.stringify([
      ...currentFiles,
      join(dir, 'removed.prd'),
    ]));

    const result = detectDrift(dir);
    expect(result.status).toBe('drifted');
    expect(result.files.some(f => f.status === 'removed')).toBe(true);
  });

  it('shows modified when same files but content differs', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });

    const currentFiles = [join(dir, 'app.prd')];
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'different-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    writeFileSync(join(prodaraDir, 'sources.json'), JSON.stringify(currentFiles));

    const result = detectDrift(dir);
    expect(result.status).toBe('drifted');
    expect(result.files.every(f => f.status === 'modified')).toBe(true);
  });

  it('handles invalid sources.json gracefully', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    writeFileSync(join(prodaraDir, 'sources.json'), '<<< invalid json >>>');

    const result = detectDrift(dir);
    expect(result.status).toBe('drifted');
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('formats human-readable output', () => {
    const dir = createTempProject();
    const result = detectDrift(dir);
    const output = formatDriftHuman(result);

    expect(output).toContain('Drift Status');
  });

  it('formats drifted output with changed files', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));

    const result = detectDrift(dir);
    const output = formatDriftHuman(result);

    expect(output).toContain('Changed files');
  });

  it('formats summary with added/removed/modified counts', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    writeFileSync(join(prodaraDir, 'sources.json'), JSON.stringify([
      join(dir, 'app.prd'),
      join(dir, 'removed.prd'),
    ]));

    const result = detectDrift(dir);
    expect(result.summary).toContain('drifted');
  });

  it('includes added count in summary when files are new', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    // sources.json lists a file that no longer exists — current app.prd is "added"
    writeFileSync(join(prodaraDir, 'sources.json'), JSON.stringify([
      join(dir, 'old.prd'),
    ]));

    const result = detectDrift(dir);
    expect(result.summary).toContain('added');
    expect(result.files.some(f => f.status === 'added')).toBe(true);
  });

  it('formats added files with + icon', () => {
    const dir = createTempProject();
    const prodaraDir = join(dir, '.prodara');
    mkdirSync(prodaraDir, { recursive: true });
    writeFileSync(join(prodaraDir, 'build.json'), JSON.stringify({
      version: '0.1.0',
      lastCompiled: new Date().toISOString(),
      sourceHash: 'old-hash',
      graphHash: 'test',
      checksum: 'test',
    }));
    writeFileSync(join(prodaraDir, 'sources.json'), JSON.stringify([
      join(dir, 'old.prd'),
    ]));

    const result = detectDrift(dir);
    const output = formatDriftHuman(result);
    expect(output).toContain('+ ');
  });
});
