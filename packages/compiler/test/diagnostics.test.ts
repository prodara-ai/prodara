import { describe, it, expect } from 'vitest';
import { DiagnosticBag } from '../src/diagnostics/diagnostic.js';
import type { Diagnostic } from '../src/diagnostics/diagnostic.js';
import { formatDiagnosticsJson, formatDiagnosticsHuman } from '../src/diagnostics/reporter.js';

function makeDiag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    phase: 'lexer',
    category: 'lexical_error',
    severity: 'error',
    code: 'PRD0100',
    message: 'test error',
    file: 'test.prd',
    line: 1,
    column: 1,
    ...overrides,
  };
}

describe('DiagnosticBag', () => {
  it('starts empty', () => {
    const bag = new DiagnosticBag();
    expect(bag.all).toHaveLength(0);
    expect(bag.errors).toHaveLength(0);
    expect(bag.warnings).toHaveLength(0);
    expect(bag.hasErrors).toBe(false);
  });

  it('accumulates diagnostics', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag());
    bag.add(makeDiag({ severity: 'warning' }));
    expect(bag.all).toHaveLength(2);
  });

  it('filters errors and warnings', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ severity: 'error' }));
    bag.add(makeDiag({ severity: 'warning' }));
    bag.add(makeDiag({ severity: 'info' }));
    expect(bag.errors).toHaveLength(1);
    expect(bag.warnings).toHaveLength(1);
    expect(bag.hasErrors).toBe(true);
  });

  it('hasErrors is false for warnings only', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ severity: 'warning' }));
    expect(bag.hasErrors).toBe(false);
  });

  it('merges another bag', () => {
    const bag1 = new DiagnosticBag();
    bag1.add(makeDiag({ code: 'A' }));
    const bag2 = new DiagnosticBag();
    bag2.add(makeDiag({ code: 'B' }));
    bag1.merge(bag2);
    expect(bag1.all).toHaveLength(2);
  });

  it('sorts by file, then line, then column', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ file: 'b.prd', line: 2, column: 1 }));
    bag.add(makeDiag({ file: 'a.prd', line: 3, column: 1 }));
    bag.add(makeDiag({ file: 'a.prd', line: 1, column: 5 }));
    bag.add(makeDiag({ file: 'a.prd', line: 1, column: 1 }));
    const sorted = bag.sorted();
    expect(sorted[0]!.file).toBe('a.prd');
    expect(sorted[0]!.line).toBe(1);
    expect(sorted[0]!.column).toBe(1);
    expect(sorted[1]!.column).toBe(5);
    expect(sorted[2]!.line).toBe(3);
    expect(sorted[3]!.file).toBe('b.prd');
  });

  it('sorts diagnostics with undefined line and column', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ file: 'a.prd', line: undefined, column: undefined }));
    bag.add(makeDiag({ file: 'a.prd', line: 5, column: 3 }));
    bag.add(makeDiag({ file: 'a.prd', line: undefined, column: 1 }));
    const sorted = bag.sorted();
    // undefined lines map to 0, so they sort before line 5
    expect(sorted[0]!.line).toBeUndefined();
    expect(sorted[2]!.line).toBe(5);
  });
});

describe('Reporter — JSON', () => {
  it('produces valid JSON with spec-defined envelope', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag());
    const json = formatDiagnosticsJson(bag);
    const report = JSON.parse(json);
    expect(report.format).toBe('prodara-diagnostics');
    expect(report.version).toBe('0.1.0');
    expect(report.source).toBe('prodara-compiler');
    expect(report.timestamp).toBeDefined();
    expect(report.summary.errors).toBe(1);
    expect(report.summary.warnings).toBe(0);
    expect(report.diagnostics).toHaveLength(1);
  });

  it('serializes all diagnostic fields', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({
      line: 10,
      column: 5,
      endLine: 10,
      endColumn: 15,
      constructKind: 'entity',
      constructId: 'mod.entity.Foo',
    }));
    const report = JSON.parse(formatDiagnosticsJson(bag));
    const d = report.diagnostics[0];
    expect(d.line).toBe(10);
    expect(d.column).toBe(5);
    expect(d.end_line).toBe(10);
    expect(d.end_column).toBe(15);
    expect(d.construct_kind).toBe('entity');
    expect(d.construct_id).toBe('mod.entity.Foo');
  });

  it('includes related locations', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({
      related: [{ message: 'see also', file: 'other.prd', line: 5, column: 1 }],
    }));
    const report = JSON.parse(formatDiagnosticsJson(bag));
    expect(report.diagnostics[0].related).toHaveLength(1);
    expect(report.diagnostics[0].related[0].message).toBe('see also');
  });

  it('includes fix suggestions', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({
      fix: { description: 'Add import', suggestions: ['import core'] },
    }));
    const report = JSON.parse(formatDiagnosticsJson(bag));
    expect(report.diagnostics[0].fix.description).toBe('Add import');
    expect(report.diagnostics[0].fix.suggestions).toEqual(['import core']);
  });

  it('empty bag produces zero diagnostics', () => {
    const bag = new DiagnosticBag();
    const report = JSON.parse(formatDiagnosticsJson(bag));
    expect(report.diagnostics).toHaveLength(0);
    expect(report.summary.errors).toBe(0);
  });
});

describe('Reporter — Human', () => {
  it('returns empty string for no diagnostics', () => {
    const bag = new DiagnosticBag();
    expect(formatDiagnosticsHuman(bag)).toBe('');
  });

  it('formats error with location', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ file: 'app.prd', line: 5, column: 3, code: 'PRD0100', message: 'oops' }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('app.prd:5:3');
    expect(output).toContain('error PRD0100');
    expect(output).toContain('oops');
    expect(output).toContain('1 error(s), 0 warning(s)');
  });

  it('formats related locations', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({
      related: [{ message: 'defined here', file: 'other.prd', line: 10 }],
    }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('↳');
    expect(output).toContain('other.prd:10:1');
    expect(output).toContain('defined here');
  });

  it('formats fix descriptions', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ fix: { description: 'Try renaming the field' } }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('fix: Try renaming the field');
  });

  it('counts errors and warnings', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ severity: 'error' }));
    bag.add(makeDiag({ severity: 'error' }));
    bag.add(makeDiag({ severity: 'warning' }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('2 error(s), 1 warning(s)');
  });

  it('formats diagnostic without line number', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ line: undefined, column: undefined }));
    const output = formatDiagnosticsHuman(bag);
    // Should not include :line:column when line is undefined
    expect(output).not.toContain(':5:');
    expect(output).toContain('test.prd');
    expect(output).toContain('error PRD0100');
  });

  it('formats diagnostic without column (defaults to 1)', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ line: 10, column: undefined }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('test.prd:10:1');
  });

  it('formats related location without line number', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({
      related: [{ message: 'see also', file: 'other.prd' }],
    }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('↳');
    expect(output).toContain('other.prd:');
    // related with no line should just show file
    expect(output).toMatch(/↳ other\.prd: see also/);
  });

  it('formats related location without column (defaults to 1)', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({
      related: [{ message: 'here', file: 'other.prd', line: 5 }],
    }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('other.prd:5:1');
  });

  it('formats info severity diagnostic', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ severity: 'info' }));
    const output = formatDiagnosticsHuman(bag);
    expect(output).toContain('info PRD0100');
  });
});

describe('DiagnosticBag sorting', () => {
  it('sorts by column when file and line are same', () => {
    const bag = new DiagnosticBag();
    bag.add(makeDiag({ file: 'a.prd', line: 1, column: 10 }));
    bag.add(makeDiag({ file: 'a.prd', line: 1, column: 5 }));
    const sorted = bag.sorted();
    expect(sorted[0]!.column).toBe(5);
    expect(sorted[1]!.column).toBe(10);
  });
});
