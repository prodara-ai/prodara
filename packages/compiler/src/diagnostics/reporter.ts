// ---------------------------------------------------------------------------
// Prodara Compiler — Diagnostic Reporters
// ---------------------------------------------------------------------------

import type { Diagnostic, DiagnosticBag } from './diagnostic.js';

export interface DiagnosticsReport {
  readonly format: 'prodara-diagnostics';
  readonly version: '0.1.0';
  readonly source: 'prodara-compiler';
  readonly timestamp: string;
  readonly summary: { errors: number; warnings: number; info: number };
  readonly diagnostics: readonly SerializedDiagnostic[];
}

interface SerializedDiagnostic {
  phase: string;
  category: string;
  severity: string;
  code: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  end_line?: number;
  end_column?: number;
  construct_kind?: string;
  construct_id?: string;
  related?: readonly { message: string; file: string; line?: number; column?: number }[];
  fix?: { description: string; suggestions?: readonly string[] };
}

function serializeDiagnostic(d: Diagnostic): SerializedDiagnostic {
  const out: Record<string, unknown> = {
    phase: d.phase,
    category: d.category,
    severity: d.severity,
    code: d.code,
    message: d.message,
    file: d.file,
  };
  if (d.line !== undefined) out['line'] = d.line;
  if (d.column !== undefined) out['column'] = d.column;
  if (d.endLine !== undefined) out['end_line'] = d.endLine;
  if (d.endColumn !== undefined) out['end_column'] = d.endColumn;
  if (d.constructKind !== undefined) out['construct_kind'] = d.constructKind;
  if (d.constructId !== undefined) out['construct_id'] = d.constructId;
  if (d.related !== undefined && d.related.length > 0) out['related'] = d.related;
  if (d.fix !== undefined) out['fix'] = d.fix;
  return out as unknown as SerializedDiagnostic;
}

/** Serialize diagnostics to the spec-defined JSON format. */
export function formatDiagnosticsJson(bag: DiagnosticBag): string {
  const sorted = bag.sorted();
  const report: DiagnosticsReport = {
    format: 'prodara-diagnostics',
    version: '0.1.0',
    source: 'prodara-compiler',
    timestamp: new Date().toISOString(),
    summary: {
      errors: sorted.filter((d) => d.severity === 'error').length,
      warnings: sorted.filter((d) => d.severity === 'warning').length,
      info: sorted.filter((d) => d.severity === 'info').length,
    },
    diagnostics: sorted.map(serializeDiagnostic),
  };
  return JSON.stringify(report, null, 2);
}

/** Format diagnostics for human-readable terminal output. */
export function formatDiagnosticsHuman(bag: DiagnosticBag): string {
  const sorted = bag.sorted();
  if (sorted.length === 0) return '';

  const lines: string[] = [];
  for (const d of sorted) {
    const loc = d.line !== undefined ? `:${d.line}:${d.column ?? 1}` : '';
    const prefix = d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warning' : 'info';
    lines.push(`${d.file}${loc} - ${prefix} ${d.code}: ${d.message}`);
    if (d.related) {
      for (const r of d.related) {
        const rLoc = r.line !== undefined ? `:${r.line}:${r.column ?? 1}` : '';
        lines.push(`  ↳ ${r.file}${rLoc}: ${r.message}`);
      }
    }
    if (d.fix) {
      lines.push(`  fix: ${d.fix.description}`);
    }
  }

  const errCount = sorted.filter((d) => d.severity === 'error').length;
  const warnCount = sorted.filter((d) => d.severity === 'warning').length;
  lines.push('');
  lines.push(`${errCount} error(s), ${warnCount} warning(s)`);
  return lines.join('\n');
}
