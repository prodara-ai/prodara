// ---------------------------------------------------------------------------
// Process Lifecycle & Signal Handling Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  registerShutdownHandlers,
  setActiveRoot,
  clearActiveRoot,
  onShutdown,
  performCleanup,
  resetLifecycle,
} from '../src/cli/lifecycle.js';
import { acquireLock } from '../src/build-state/build-state.js';

describe('Lifecycle', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-lifecycle-'));
    resetLifecycle();
  });

  afterEach(() => {
    resetLifecycle();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('registerShutdownHandlers', () => {
    it('is idempotent — calling twice does not throw', () => {
      registerShutdownHandlers();
      registerShutdownHandlers();
    });
  });

  describe('setActiveRoot / clearActiveRoot', () => {
    it('sets and clears root without error', () => {
      setActiveRoot(tempDir);
      clearActiveRoot();
    });
  });

  describe('performCleanup', () => {
    it('does nothing when no active root is set', () => {
      expect(() => performCleanup()).not.toThrow();
    });

    it('releases lock when active root has a lock', () => {
      mkdirSync(join(tempDir, '.prodara'), { recursive: true });
      acquireLock(tempDir);
      expect(existsSync(join(tempDir, '.prodara', '.lock'))).toBe(true);

      setActiveRoot(tempDir);
      performCleanup();

      expect(existsSync(join(tempDir, '.prodara', '.lock'))).toBe(false);
    });

    it('cleans up temp files when active root has temps', () => {
      const prodaraDir = join(tempDir, '.prodara');
      mkdirSync(prodaraDir, { recursive: true });
      writeFileSync(join(prodaraDir, 'graph.json.tmp'), '{}', 'utf-8');
      writeFileSync(join(prodaraDir, 'plan.json.tmp'), '{}', 'utf-8');

      setActiveRoot(tempDir);
      performCleanup();

      expect(existsSync(join(prodaraDir, 'graph.json.tmp'))).toBe(false);
      expect(existsSync(join(prodaraDir, 'plan.json.tmp'))).toBe(false);
    });

    it('runs extra shutdown callbacks', () => {
      let called = false;
      onShutdown(() => { called = true; });
      performCleanup();
      expect(called).toBe(true);
    });

    it('handles errors in shutdown callbacks gracefully', () => {
      onShutdown(() => { throw new Error('boom'); });
      expect(() => performCleanup()).not.toThrow();
    });

    it('handles missing .prodara directory gracefully', () => {
      setActiveRoot(tempDir);
      // No .prodara directory exists — cleanup should not throw
      expect(() => performCleanup()).not.toThrow();
    });
  });

  describe('onShutdown', () => {
    it('registers multiple callbacks', () => {
      const calls: number[] = [];
      onShutdown(() => calls.push(1));
      onShutdown(() => calls.push(2));
      performCleanup();
      expect(calls).toEqual([1, 2]);
    });
  });

  describe('resetLifecycle', () => {
    it('clears all state', () => {
      setActiveRoot(tempDir);
      let called = false;
      onShutdown(() => { called = true; });
      resetLifecycle();
      performCleanup();
      // After reset, no callbacks should run
      expect(called).toBe(false);
    });
  });
});
