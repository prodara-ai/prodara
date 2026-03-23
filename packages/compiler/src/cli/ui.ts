// ---------------------------------------------------------------------------
// Prodara CLI — UI Utilities
// ---------------------------------------------------------------------------
// Central DX module: colors, banners, boxes, tables, spinners, icons.
// All formatting functions are pure (return strings, don't write to stdout).
// Respects NO_COLOR automatically via picocolors.

import pc from 'picocolors';
import ora from 'ora';
import type { Ora } from 'ora';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

export const bold = (msg: string): string => pc.bold(msg);
export const dim = (msg: string): string => pc.dim(msg);
export const green = (msg: string): string => pc.green(msg);
export const red = (msg: string): string => pc.red(msg);
export const yellow = (msg: string): string => pc.yellow(msg);
export const cyan = (msg: string): string => pc.cyan(msg);

// ---------------------------------------------------------------------------
// Status message helpers
// ---------------------------------------------------------------------------

export const success = (msg: string): string => `${pc.green('✓')} ${msg}`;
export const error = (msg: string): string => `${pc.red('✗')} ${msg}`;
export const warn = (msg: string): string => `${pc.yellow('⚠')} ${msg}`;
export const info = (msg: string): string => `${pc.cyan('ℹ')} ${msg}`;

// ---------------------------------------------------------------------------
// Phase status icons (build pipeline)
// ---------------------------------------------------------------------------

export function phaseIcon(status: 'ok' | 'warn' | 'error' | 'skip' | 'skipped'): string {
  switch (status) {
    case 'ok': return pc.green('✓');
    case 'warn': return pc.yellow('⚠');
    case 'error': return pc.red('✗');
    case 'skip':
    case 'skipped': return pc.dim('○');
  }
}

// ---------------------------------------------------------------------------
// Banner — boxed header with dimmed border
// ---------------------------------------------------------------------------

export function banner(text: string): string {
  const pad = 2;
  const inner = text.length + pad * 2;
  const top = pc.dim('┌' + '─'.repeat(inner) + '┐');
  const mid = pc.dim('│') + ' '.repeat(pad) + pc.bold(text) + ' '.repeat(pad) + pc.dim('│');
  const bot = pc.dim('└' + '─'.repeat(inner) + '┘');
  return `${top}\n${mid}\n${bot}`;
}

// ---------------------------------------------------------------------------
// Box — titled panel with multiple lines
// ---------------------------------------------------------------------------

export function box(title: string, lines: string[]): string {
  const allLines = [pc.bold(title), ...lines];
  const maxLen = allLines.reduce((max, l) => Math.max(max, stripAnsi(l).length), 0);
  const width = maxLen + 4;
  const top = pc.dim('┌' + '─'.repeat(width) + '┐');
  const bot = pc.dim('└' + '─'.repeat(width) + '┘');
  const body = allLines.map(l => {
    const visible = stripAnsi(l).length;
    return pc.dim('│') + '  ' + l + ' '.repeat(width - visible - 2) + pc.dim('│');
  });
  return [top, ...body, bot].join('\n');
}

// ---------------------------------------------------------------------------
// Table — column-aligned with header separator
// ---------------------------------------------------------------------------

export function table(headers: string[], rows: string[][]): string {
  const cols = headers.length;
  const widths = new Array<number>(cols).fill(0);

  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(widths[c]!, stripAnsi(headers[c]!).length);
    for (const row of rows) {
      widths[c] = Math.max(widths[c]!, stripAnsi(row[c] ?? '').length);
    }
  }

  const pad = (s: string, w: number) => s + ' '.repeat(w - stripAnsi(s).length);
  const headerLine = '  ' + headers.map((h, i) => pc.bold(pad(h, widths[i]!))).join('  ');
  const separator = '  ' + widths.map(w => pc.dim('─'.repeat(w))).join('  ');
  const bodyLines = rows.map(row =>
    '  ' + row.map((cell, i) => pad(cell, widths[i]!)).join('  '),
  );

  return [headerLine, separator, ...bodyLines].join('\n');
}

// ---------------------------------------------------------------------------
// Interactivity detection
// ---------------------------------------------------------------------------

export function isInteractive(): boolean {
  return process.stdout.isTTY === true && !process.env['CI'];
}

// ---------------------------------------------------------------------------
// Spinner (ora wrapper)
// ---------------------------------------------------------------------------

export interface Spinner {
  start(text?: string): Spinner;
  succeed(text?: string): Spinner;
  fail(text?: string): Spinner;
  stop(): Spinner;
  text: string;
}

const noopSpinner: Spinner = {
  start() { return this; },
  succeed() { return this; },
  fail() { return this; },
  stop() { return this; },
  text: '',
};

export function createSpinner(text: string): Spinner {
  if (!isInteractive()) return { ...noopSpinner, text };

  const s = ora({ text, stream: process.stderr });
  return {
    start(t?: string) { s.start(t); return this; },
    succeed(t?: string) { s.succeed(t); return this; },
    fail(t?: string) { s.fail(t); return this; },
    stop() { s.stop(); return this; },
    get text() { return s.text; },
    set text(v: string) { s.text = v; },
  };
}

// ---------------------------------------------------------------------------
// ANSI strip (for width calculations)
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}
