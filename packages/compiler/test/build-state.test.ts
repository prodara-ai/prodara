import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureBuildDir, readPreviousGraph, writeBuildState, acquireLock, releaseLock, cleanupTempFiles } from '../src/build-state/build-state.js';
import type { BuildState, LockInfo } from '../src/build-state/build-state.js';
import type { ProductGraph } from '../src/graph/graph-types.js';
import type { Plan } from '../src/planner/plan-types.js';

function makeGraph(): ProductGraph {
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product',
      kind: 'product',
      name: 'TestProduct',
      title: 'Test Product',
      version: '1.0',
      modules: ['core'],
      publishes: null,
    },
    modules: [],
    edges: [],
    metadata: {
      compiler: 'prodara-compiler@0.1.0',
      compiled_at: '2024-01-01T00:00:00.000Z',
      source_files: [],
    },
  };
}

function makePlan(taskCount = 0): Plan {
  return {
    format: 'prodara-plan',
    version: '0.1.0',
    changes: [],
    impacts: [],
    tasks: Array.from({ length: taskCount }, (_, i) => ({
      taskId: `task-${i}`,
      nodeId: `node-${i}`,
      action: 'generate' as const,
      reason: 'Initial build',
    })),
  };
}

describe('Build State', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-build-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('ensureBuildDir', () => {
    it('creates .prodara directory', () => {
      const dir = ensureBuildDir(tempDir);
      expect(dir).toBe(join(tempDir, '.prodara'));
      expect(existsSync(dir)).toBe(true);
    });

    it('is idempotent', () => {
      ensureBuildDir(tempDir);
      ensureBuildDir(tempDir);
      expect(existsSync(join(tempDir, '.prodara'))).toBe(true);
    });
  });

  describe('readPreviousGraph', () => {
    it('returns null when no graph exists', () => {
      const result = readPreviousGraph(tempDir);
      expect(result).toBeNull();
    });

    it('reads a previously written graph', () => {
      const graph = makeGraph();
      writeBuildState(tempDir, graph, makePlan(), ['a.prd']);
      const result = readPreviousGraph(tempDir);
      expect(result).not.toBeNull();
      expect(result!.product.name).toBe('TestProduct');
    });
  });

  describe('writeBuildState', () => {
    it('writes build.json, product-graph.json, plan.json', () => {
      const graph = makeGraph();
      const plan = makePlan(1);
      writeBuildState(tempDir, graph, plan, ['a.prd']);

      const dir = join(tempDir, '.prodara');
      expect(existsSync(join(dir, 'build.json'))).toBe(true);
      expect(existsSync(join(dir, 'product-graph.json'))).toBe(true);
      expect(existsSync(join(dir, 'plan.json'))).toBe(true);
    });

    it('build.json contains expected fields', () => {
      writeBuildState(tempDir, makeGraph(), makePlan(), ['file.prd']);
      const build = JSON.parse(readFileSync(join(tempDir, '.prodara', 'build.json'), 'utf-8'));
      expect(build).toHaveProperty('version', '0.1.0');
      expect(build).toHaveProperty('lastCompiled');
      expect(build).toHaveProperty('sourceHash');
      expect(build).toHaveProperty('graphHash');
      expect(typeof build.sourceHash).toBe('string');
      expect(build.sourceHash).toHaveLength(64); // SHA-256 hex
    });

    it('product-graph.json matches written graph', () => {
      const graph = makeGraph();
      writeBuildState(tempDir, graph, makePlan(), ['src.prd']);
      const saved = JSON.parse(readFileSync(join(tempDir, '.prodara', 'product-graph.json'), 'utf-8'));
      expect(saved.product.name).toBe('TestProduct');
    });

    it('plan.json matches written plan', () => {
      const plan = makePlan(2);
      writeBuildState(tempDir, makeGraph(), plan, ['src.prd']);
      const saved = JSON.parse(readFileSync(join(tempDir, '.prodara', 'plan.json'), 'utf-8'));
      expect(saved.tasks).toHaveLength(2);
    });

    it('source hash is deterministic', () => {
      writeBuildState(tempDir, makeGraph(), makePlan(), ['a.prd', 'b.prd']);
      const b1 = JSON.parse(readFileSync(join(tempDir, '.prodara', 'build.json'), 'utf-8'));
      writeBuildState(tempDir, makeGraph(), makePlan(), ['b.prd', 'a.prd']);
      const b2 = JSON.parse(readFileSync(join(tempDir, '.prodara', 'build.json'), 'utf-8'));
      expect(b1.sourceHash).toBe(b2.sourceHash);
    });

    it('build.json contains checksum field', () => {
      writeBuildState(tempDir, makeGraph(), makePlan(), ['file.prd']);
      const build: BuildState = JSON.parse(readFileSync(join(tempDir, '.prodara', 'build.json'), 'utf-8'));
      expect(build).toHaveProperty('checksum');
      expect(typeof build.checksum).toBe('string');
      expect(build.checksum).toHaveLength(64);
    });

    it('no temp files remain after successful write', () => {
      writeBuildState(tempDir, makeGraph(), makePlan(), ['a.prd']);
      const dir = join(tempDir, '.prodara');
      expect(existsSync(join(dir, 'product-graph.json.tmp'))).toBe(false);
      expect(existsSync(join(dir, 'plan.json.tmp'))).toBe(false);
      expect(existsSync(join(dir, 'build.json.tmp'))).toBe(false);
    });
  });

  describe('cleanupTempFiles', () => {
    it('removes leftover temp files', () => {
      const dir = ensureBuildDir(tempDir);
      writeFileSync(join(dir, 'product-graph.json.tmp'), 'partial', 'utf-8');
      writeFileSync(join(dir, 'plan.json.tmp'), 'partial', 'utf-8');
      cleanupTempFiles(tempDir);
      expect(existsSync(join(dir, 'product-graph.json.tmp'))).toBe(false);
      expect(existsSync(join(dir, 'plan.json.tmp'))).toBe(false);
    });

    it('does not throw when no temp files exist', () => {
      ensureBuildDir(tempDir);
      expect(() => cleanupTempFiles(tempDir)).not.toThrow();
    });
  });

  describe('acquireLock / releaseLock', () => {
    it('creates a lock file', () => {
      acquireLock(tempDir);
      const lockPath = join(tempDir, '.prodara', '.lock');
      expect(existsSync(lockPath)).toBe(true);
      const lock: LockInfo = JSON.parse(readFileSync(lockPath, 'utf-8'));
      expect(lock.pid).toBe(process.pid);
      expect(typeof lock.timestamp).toBe('string');
      releaseLock(tempDir);
    });

    it('releaseLock removes lock file', () => {
      acquireLock(tempDir);
      releaseLock(tempDir);
      expect(existsSync(join(tempDir, '.prodara', '.lock'))).toBe(false);
    });

    it('releaseLock does not throw when no lock exists', () => {
      expect(() => releaseLock(tempDir)).not.toThrow();
    });

    it('throws when lock is held by current process', () => {
      acquireLock(tempDir);
      expect(() => acquireLock(tempDir)).toThrow(/Build locked by PID/);
      releaseLock(tempDir);
    });

    it('force-acquires a stale lock from dead PID', () => {
      const dir = ensureBuildDir(tempDir);
      const staleLock: LockInfo = { pid: 999999, timestamp: new Date().toISOString() };
      writeFileSync(join(dir, '.lock'), JSON.stringify(staleLock), 'utf-8');
      // PID 999999 is almost certainly dead
      expect(() => acquireLock(tempDir)).not.toThrow();
      releaseLock(tempDir);
    });

    it('force-acquires a lock older than 5 minutes', () => {
      const dir = ensureBuildDir(tempDir);
      const oldTime = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const staleLock: LockInfo = { pid: process.pid, timestamp: oldTime };
      writeFileSync(join(dir, '.lock'), JSON.stringify(staleLock), 'utf-8');
      expect(() => acquireLock(tempDir)).not.toThrow();
      releaseLock(tempDir);
    });

    it('handles corrupt lock file gracefully', () => {
      const dir = ensureBuildDir(tempDir);
      writeFileSync(join(dir, '.lock'), 'not-json', 'utf-8');
      expect(() => acquireLock(tempDir)).not.toThrow();
      releaseLock(tempDir);
    });
  });
});
