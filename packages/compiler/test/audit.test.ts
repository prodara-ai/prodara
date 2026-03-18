import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAuditRecord, writeAuditRecord, listAuditRecords, AuditRecordBuilder } from '../src/audit/index.js';
import type { AuditRecord, AuditPhase } from '../src/audit/index.js';
import type { ResolvedAuditConfig } from '../src/config/config.js';

const ENABLED_CONFIG: ResolvedAuditConfig = { enabled: true, path: '.prodara/runs/' };
const DISABLED_CONFIG: ResolvedAuditConfig = { enabled: false, path: '.prodara/runs/' };

describe('Audit', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-audit-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('AuditRecordBuilder', () => {
    it('creates a record with defaults', () => {
      const record = createAuditRecord('Test product').build();
      expect(record.spec_summary).toBe('Test product');
      expect(record.compiler_version).toBe('0.1.0');
      expect(record.outcome).toBe('success');
      expect(record.blocker).toBeNull();
      expect(record.phases).toHaveLength(0);
      expect(record.files_changed).toHaveLength(0);
      expect(typeof record.timestamp).toBe('string');
    });

    it('adds phases', () => {
      const phase: AuditPhase = {
        name: 'compile',
        status: 'ok',
        duration_ms: 100,
        metrics: { files: 3 },
      };
      const record = createAuditRecord('Test').addPhase(phase).build();
      expect(record.phases).toHaveLength(1);
      expect(record.phases[0]!.name).toBe('compile');
    });

    it('sets outcome', () => {
      const record = createAuditRecord('Test').setOutcome('failed').build();
      expect(record.outcome).toBe('failed');
    });

    it('sets blocker and auto-sets outcome', () => {
      const record = createAuditRecord('Test')
        .setBlocker({
          phase: 'validate',
          reason: 'Tests failed',
          impact: 'Cannot proceed to review',
          resolution: 'Fix failing tests',
        })
        .build();
      expect(record.outcome).toBe('blocked');
      expect(record.blocker!.phase).toBe('validate');
    });

    it('sets files changed', () => {
      const record = createAuditRecord('Test')
        .setFilesChanged(['src/a.ts', 'src/b.ts'])
        .build();
      expect(record.files_changed).toEqual(['src/a.ts', 'src/b.ts']);
    });

    it('sets config options and redacts sensitive keys', () => {
      const record = createAuditRecord('Test')
        .setConfigOptions({ maxIterations: 3, apiKey: 'secret123' })
        .build();
      expect(record.config_options['maxIterations']).toBe(3);
      expect(record.config_options['apiKey']).toBe('[REDACTED]');
    });
  });

  describe('writeAuditRecord', () => {
    it('writes record to audit directory', () => {
      const record = createAuditRecord('Test').build();
      const path = writeAuditRecord(tempDir, ENABLED_CONFIG, record);
      expect(path).not.toBeNull();
      expect(existsSync(path!)).toBe(true);

      const saved = JSON.parse(readFileSync(path!, 'utf-8')) as AuditRecord;
      expect(saved.spec_summary).toBe('Test');
      expect(saved.compiler_version).toBe('0.1.0');
    });

    it('creates audit directory if needed', () => {
      const record = createAuditRecord('Test').build();
      const dir = join(tempDir, '.prodara', 'runs');
      expect(existsSync(dir)).toBe(false);
      writeAuditRecord(tempDir, ENABLED_CONFIG, record);
      expect(existsSync(dir)).toBe(true);
    });

    it('returns null when audit disabled', () => {
      const record = createAuditRecord('Test').build();
      const path = writeAuditRecord(tempDir, DISABLED_CONFIG, record);
      expect(path).toBeNull();
    });

    it('sanitizes sensitive data in written file', () => {
      const record = createAuditRecord('Test')
        .setConfigOptions({ apiKey: 'sk-123', nested: { token: 'abc' } })
        .build();
      const path = writeAuditRecord(tempDir, ENABLED_CONFIG, record);
      const saved = JSON.parse(readFileSync(path!, 'utf-8')) as AuditRecord;
      expect(saved.config_options['apiKey']).toBe('[REDACTED]');
      expect((saved.config_options['nested'] as Record<string, unknown>)['token']).toBe('[REDACTED]');
    });

    it('uses safe filename from timestamp', () => {
      const record = createAuditRecord('Test').build();
      const path = writeAuditRecord(tempDir, ENABLED_CONFIG, record);
      // Filename should not contain colons or periods from ISO timestamp
      expect(path!).not.toMatch(/:\d/);
      expect(path!).toMatch(/\.json$/);
    });
  });

  describe('listAuditRecords', () => {
    it('returns empty when no records exist', () => {
      const records = listAuditRecords(tempDir, ENABLED_CONFIG);
      expect(records).toHaveLength(0);
    });

    it('lists existing records sorted', () => {
      const r1 = createAuditRecord('First').build();
      const r2 = createAuditRecord('Second').build();
      writeAuditRecord(tempDir, ENABLED_CONFIG, r1);
      writeAuditRecord(tempDir, ENABLED_CONFIG, r2);

      const records = listAuditRecords(tempDir, ENABLED_CONFIG);
      expect(records.length).toBeGreaterThanOrEqual(1);
      for (const r of records) {
        expect(r).toMatch(/\.json$/);
      }
    });

    it('returns sorted paths', () => {
      const r1 = createAuditRecord('A').build();
      writeAuditRecord(tempDir, ENABLED_CONFIG, r1);
      const r2 = createAuditRecord('B').build();
      writeAuditRecord(tempDir, ENABLED_CONFIG, r2);

      const records = listAuditRecords(tempDir, ENABLED_CONFIG);
      expect(records).toEqual([...records].sort());
    });
  });
});
