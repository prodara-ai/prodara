import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { compile } from '../src/cli/compile.js';
import { FIXTURES_DIR } from './helpers.js';

describe('Compile — integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-compile-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports error for empty directory', () => {
    const result = compile(tempDir);
    expect(result.diagnostics.hasErrors).toBe(true);
    expect(result.diagnostics.errors.some((d) => d.code === 'PRD0010')).toBe(true);
  });

  it('compiles a minimal product', () => {
    writeFileSync(join(tempDir, 'app.prd'), `
      product TestApp {
        version: "1.0"
      }
    `);
    writeFileSync(join(tempDir, 'core.prd'), `
      module core {
        entity Task {
          name: string
          done: boolean
        }
      }
    `);
    const result = compile(tempDir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(false);
    expect(result.files.length).toBeGreaterThanOrEqual(2);
    expect(result.graph).toBeDefined();
    expect(result.plan).toBeDefined();
  });

  it('stops after validate', () => {
    writeFileSync(join(tempDir, 'app.prd'), `
      product P { version: "1.0" }
    `);
    writeFileSync(join(tempDir, 'm.prd'), `
      module m { entity E { x: string } }
    `);
    const result = compile(tempDir, { stopAfter: 'validate', writeBuild: false });
    expect(result.graph).toBeUndefined();
    expect(result.plan).toBeUndefined();
    expect(result.bindResult).toBeDefined();
  });

  it('stops after graph', () => {
    writeFileSync(join(tempDir, 'app.prd'), 'product P { version: "1.0" }');
    writeFileSync(join(tempDir, 'm.prd'), 'module m { entity E { x: string } }');
    const result = compile(tempDir, { stopAfter: 'graph', writeBuild: false });
    expect(result.graph).toBeDefined();
    expect(result.graphJson).toBeDefined();
    expect(result.plan).toBeUndefined();
  });

  it('stops after plan', () => {
    writeFileSync(join(tempDir, 'app.prd'), 'product P { version: "1.0" }');
    writeFileSync(join(tempDir, 'm.prd'), 'module m { entity E { x: string } }');
    const result = compile(tempDir, { stopAfter: 'plan', writeBuild: false });
    expect(result.plan).toBeDefined();
    expect(result.testResults).toBeUndefined();
  });

  it('accepts explicit file list', () => {
    writeFileSync(join(tempDir, 'a.prd'), 'product P { version: "1.0" }');
    writeFileSync(join(tempDir, 'b.prd'), 'module b { entity X { y: string } }');
    const result = compile(tempDir, {
      files: [join(tempDir, 'a.prd'), join(tempDir, 'b.prd')],
      writeBuild: false,
    });
    expect(result.diagnostics.hasErrors).toBe(false);
    expect(result.files).toHaveLength(2);
  });

  it('propagates parse errors', () => {
    writeFileSync(join(tempDir, 'bad.prd'), '{{{{');
    const result = compile(tempDir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('writes build state when enabled', () => {
    writeFileSync(join(tempDir, 'app.prd'), 'product P { version: "1.0" }');
    writeFileSync(join(tempDir, 'm.prd'), 'module m { entity E { x: string } }');
    const result = compile(tempDir, { writeBuild: true });
    expect(result.diagnostics.hasErrors).toBe(false);
    // .prodara directory should exist
    expect(existsSync(join(tempDir, '.prodara', 'build.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.prodara', 'product-graph.json'))).toBe(true);
  });

  it('reports error for unreadable file', () => {
    writeFileSync(join(tempDir, 'app.prd'), 'product P { version: "1.0" }');
    // Provide a non-existent file path in the explicit files list
    const result = compile(tempDir, {
      files: [join(tempDir, 'app.prd'), join(tempDir, 'nonexistent.prd')],
      writeBuild: false,
    });
    expect(result.diagnostics.hasErrors).toBe(true);
    expect(result.diagnostics.errors.some((d) => d.code === 'PRD0011')).toBe(true);
  });

  it('returns early when binding errors occur with stopAfter validate', () => {
    writeFileSync(join(tempDir, 'app.prd'), `
      product P { version: "1.0" }
      product Q { version: "2.0" }
    `);
    writeFileSync(join(tempDir, 'm.prd'), 'module m { entity E { x: string } }');
    const result = compile(tempDir, { stopAfter: 'validate', writeBuild: false });
    // Duplicate product declarations should cause a binding error
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('handles build state write failure gracefully', () => {
    writeFileSync(join(tempDir, 'app.prd'), 'product P { version: "1.0" }');
    writeFileSync(join(tempDir, 'm.prd'), 'module m { entity E { x: string } }');
    // Create .prodara as a file instead of directory to cause write failure
    writeFileSync(join(tempDir, '.prodara'), 'not a directory');
    const result = compile(tempDir, { writeBuild: true });
    // Should still succeed despite write failure
    expect(result.diagnostics.hasErrors).toBe(false);
 });
});

describe('Compile — fixture directories', () => {
  it('compiles valid/minimal fixture', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'minimal');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
  });

  it('compiles valid/workflow-transitions fixture', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'workflow-transitions');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
  });

  it('compiles valid/multi-module fixture', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'multi-module');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
  });

  it('compiles valid/governance fixture', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'governance');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
  });

  it('compiles valid/compound-rules fixture', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'compound-rules');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
  });

  it('compiles valid/full-featured fixture', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'full-featured');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
    expect(result.plan).toBeDefined();
  });

  it('produces errors for invalid/unresolved-symbol', () => {
    const dir = join(FIXTURES_DIR, 'invalid', 'unresolved-symbol');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('produces errors for invalid/missing-module', () => {
    const dir = join(FIXTURES_DIR, 'invalid', 'missing-module');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('produces errors for invalid/duplicate-entity', () => {
    const dir = join(FIXTURES_DIR, 'invalid', 'duplicate-entity');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('produces errors for invalid/invalid-transition', () => {
    const dir = join(FIXTURES_DIR, 'invalid', 'invalid-transition');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('produces errors for invalid/ambiguous-import', () => {
    const dir = join(FIXTURES_DIR, 'invalid', 'ambiguous-import');
    const result = compile(dir, { writeBuild: false });
    expect(result.diagnostics.hasErrors).toBe(true);
  });

  it('stops after graph phase', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'full-featured');
    const result = compile(dir, { writeBuild: false, stopAfter: 'graph' });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
    expect(result.plan).toBeUndefined();
  });

  it('stops after plan phase', () => {
    const dir = join(FIXTURES_DIR, 'valid', 'full-featured');
    const result = compile(dir, { writeBuild: false, stopAfter: 'plan' });
    expect(result.diagnostics.errors).toHaveLength(0);
    expect(result.graph).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.testResults).toBeUndefined();
  });
});
