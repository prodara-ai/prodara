// ---------------------------------------------------------------------------
// Prodara Compiler — Diagnostics
// ---------------------------------------------------------------------------

import type { DiagnosticCategory, DiagnosticPhase, DiagnosticSeverity } from '../types.js';

export interface RelatedLocation {
  readonly message: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

export interface DiagnosticFix {
  readonly description: string;
  readonly suggestions?: readonly string[];
}

export interface Diagnostic {
  readonly phase: DiagnosticPhase;
  readonly category: DiagnosticCategory;
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly constructKind?: string;
  readonly constructId?: string;
  readonly related?: readonly RelatedLocation[];
  readonly fix?: DiagnosticFix;
}

/**
 * Accumulator for diagnostics across compiler phases.
 * Maintains deterministic ordering: by file, then line, then column.
 */
export class DiagnosticBag {
  private readonly items: Diagnostic[] = [];

  add(d: Diagnostic): void {
    this.items.push(d);
  }

  get all(): readonly Diagnostic[] {
    return this.items;
  }

  get errors(): readonly Diagnostic[] {
    return this.items.filter((d) => d.severity === 'error');
  }

  get warnings(): readonly Diagnostic[] {
    return this.items.filter((d) => d.severity === 'warning');
  }

  get hasErrors(): boolean {
    return this.items.some((d) => d.severity === 'error');
  }

  /** Merge all diagnostics from another bag into this one. */
  merge(other: DiagnosticBag): void {
    for (const d of other.all) {
      this.items.push(d);
    }
  }

  /** Return diagnostics in deterministic order (file → line → column). */
  sorted(): readonly Diagnostic[] {
    return [...this.items].sort((a, b) => {
      const fileComp = a.file.localeCompare(b.file);
      if (fileComp !== 0) return fileComp;
      const lineComp = (a.line ?? 0) - (b.line ?? 0);
      if (lineComp !== 0) return lineComp;
      return (a.column /* v8 ignore next */ ?? 0) - (b.column /* v8 ignore next */ ?? 0);
    });
  }
}
