import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runValidation } from '../src/validation/index.js';
import type { ResolvedValidationConfig } from '../src/config/config.js';

describe('Validation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-val-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('runValidation', () => {
    it('returns all skipped when no commands configured', () => {
      const config: ResolvedValidationConfig = { lint: null, typecheck: null, test: null, build: null };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(4);
      for (const r of result.results) {
        expect(r.status).toBe('skipped');
      }
    });

    it('runs a passing command', () => {
      const config: ResolvedValidationConfig = {
        lint: 'echo ok',
        typecheck: null,
        test: null,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(true);
      expect(result.results[0]!.status).toBe('passed');
      expect(result.results[0]!.step).toBe('lint');
      expect(result.results[0]!.exitCode).toBe(0);
      expect(result.results[0]!.stdout).toContain('ok');
    });

    it('detects a failing command', () => {
      // Create a script that exits with code 1
      const script = join(tempDir, 'fail.sh');
      writeFileSync(script, '#!/bin/sh\nexit 1\n', 'utf-8');
      chmodSync(script, '755');

      const config: ResolvedValidationConfig = {
        lint: script,
        typecheck: null,
        test: null,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(false);
      expect(result.results[0]!.status).toBe('failed');
      expect(result.results[0]!.exitCode).toBe(1);
    });

    it('runs commands in order: lint, typecheck, test, build', () => {
      const config: ResolvedValidationConfig = {
        lint: 'echo lint',
        typecheck: 'echo typecheck',
        test: 'echo test',
        build: 'echo build',
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(true);
      expect(result.results.map(r => r.step)).toEqual(['lint', 'typecheck', 'test', 'build']);
    });

    it('captures stderr from failed command', () => {
      const script = join(tempDir, 'err.sh');
      writeFileSync(script, '#!/bin/sh\necho err >&2\nexit 1\n', 'utf-8');
      chmodSync(script, '755');

      const config: ResolvedValidationConfig = {
        lint: null,
        typecheck: null,
        test: script,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.results[2]!.stderr).toContain('err');
    });

    it('reports duration_ms', () => {
      const config: ResolvedValidationConfig = {
        lint: 'echo fast',
        typecheck: null,
        test: null,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(typeof result.results[0]!.duration_ms).toBe('number');
      expect(result.results[0]!.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('skips empty command string', () => {
      const config: ResolvedValidationConfig = {
        lint: null,
        typecheck: null,
        test: null,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(true);
    });

    it('handles command that does not exist', () => {
      const config: ResolvedValidationConfig = {
        lint: 'nonexistent_command_xyz_12345',
        typecheck: null,
        test: null,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(false);
      expect(result.results[0]!.status).toBe('failed');
    });

    it('mixed passing and failing', () => {
      const script = join(tempDir, 'fail.sh');
      writeFileSync(script, '#!/bin/sh\nexit 1\n', 'utf-8');
      chmodSync(script, '755');

      const config: ResolvedValidationConfig = {
        lint: 'echo ok',
        typecheck: null,
        test: script,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(false);
      expect(result.results[0]!.status).toBe('passed');
      expect(result.results[2]!.status).toBe('failed');
    });

    it('skips empty string command (parsed to empty parts)', () => {
      const config: ResolvedValidationConfig = {
        lint: '   ',
        typecheck: null,
        test: null,
        build: null,
      };
      const result = runValidation(config, tempDir);
      expect(result.passed).toBe(true);
      expect(result.results[0]!.status).toBe('skipped');
      expect(result.results[0]!.duration_ms).toBe(0);
    });

  });
});
