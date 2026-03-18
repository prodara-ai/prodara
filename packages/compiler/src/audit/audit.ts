// ---------------------------------------------------------------------------
// Prodara Compiler — Audit Logging
// ---------------------------------------------------------------------------
// Writes JSON audit records per run to the configured audit path.
// Never logs secrets, API keys, or user input verbatim.

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ResolvedAuditConfig } from '../config/config.js';
import type { AuditRecord, AuditPhase, AuditOutcome, AuditBlocker } from './types.js';

/**
 * Create a new audit record builder.
 */
export function createAuditRecord(specSummary: string): AuditRecordBuilder {
  return new AuditRecordBuilder(specSummary);
}

/**
 * Write an audit record to disk at the configured path.
 * Creates the audit directory if needed.
 */
export function writeAuditRecord(
  root: string,
  config: ResolvedAuditConfig,
  record: AuditRecord,
): string | null {
  if (!config.enabled) return null;

  const dir = join(root, config.path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Use ISO timestamp with safe filename characters
  const safeTimestamp = record.timestamp.replace(/[:.]/g, '-');
  const filename = `${safeTimestamp}.json`;
  const filePath = join(dir, filename);

  // Sanitize before writing
  const sanitized = sanitizeRecord(record);
  writeFileSync(filePath, JSON.stringify(sanitized, null, 2), 'utf-8');

  return filePath;
}

/**
 * List existing audit records in the audit directory.
 */
export function listAuditRecords(root: string, config: ResolvedAuditConfig): string[] {
  const dir = join(root, config.path);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => join(dir, f));
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export class AuditRecordBuilder {
  private readonly startTime: string;
  private readonly phases: AuditPhase[] = [];
  private outcome: AuditOutcome = 'success';
  private blocker: AuditBlocker | null = null;
  private filesChanged: string[] = [];
  private configOptions: Record<string, unknown> = {};
  private readonly specSummary: string;

  constructor(specSummary: string) {
    this.startTime = new Date().toISOString();
    this.specSummary = specSummary;
  }

  addPhase(phase: AuditPhase): this {
    this.phases.push(phase);
    return this;
  }

  setOutcome(outcome: AuditOutcome): this {
    this.outcome = outcome;
    return this;
  }

  setBlocker(blocker: AuditBlocker): this {
    this.blocker = blocker;
    this.outcome = 'blocked';
    return this;
  }

  setFilesChanged(files: readonly string[]): this {
    this.filesChanged = [...files];
    return this;
  }

  setConfigOptions(options: Record<string, unknown>): this {
    this.configOptions = sanitizeConfigOptions(options);
    return this;
  }

  build(): AuditRecord {
    return {
      timestamp: this.startTime,
      compiler_version: '0.1.0',
      spec_summary: this.specSummary,
      config_options: this.configOptions,
      phases: [...this.phases],
      outcome: this.outcome,
      blocker: this.blocker,
      files_changed: [...this.filesChanged],
    };
  }
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = new Set(['apiKey', 'api_key', 'secret', 'token', 'password', 'credentials']);

function sanitizeRecord(record: AuditRecord): AuditRecord {
  return {
    ...record,
    config_options: sanitizeConfigOptions(record.config_options),
  };
}

function sanitizeConfigOptions(options: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeConfigOptions(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
