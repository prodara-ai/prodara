// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Format Helpers
// ---------------------------------------------------------------------------
// Shared formatting utilities for human-readable doc generation.

import type { GraphTypeRef, ModuleNode } from '../graph/graph-types.js';

// ---------------------------------------------------------------------------
// Auto-generated file banner
// ---------------------------------------------------------------------------

export function renderBanner(sourceFile: string): string[] {
  const now = new Date().toISOString();
  return [
    `<!-- ⚠️ AUTO-GENERATED FROM .prd FILES — DO NOT EDIT -->`,
    `<!-- Source: ${sourceFile} | Compiled: ${now} -->`,
    `<!-- Edit the .prd source files and recompile to update. -->`,
    '',
  ];
}

// ---------------------------------------------------------------------------
// Type display
// ---------------------------------------------------------------------------

export function formatTypeRef(ref: GraphTypeRef): string {
  if (typeof ref === 'string') return ref;
  if ('ref' in ref) {
    const parts = ref.ref.split('.');
    /* v8 ignore next -- split always returns ≥1 element */
    return parts[parts.length - 1] ?? ref.ref;
  }
  /* v8 ignore next 3 -- exhaustive: false branch of this if is unreachable */
  if ('generic' in ref) {
    return `${ref.generic}<${formatTypeRef(ref.arg)}>`;
  }
  /* v8 ignore next 3 -- exhaustive check */
  const _exhaustive: never = ref;
  return String(_exhaustive);
}

// ---------------------------------------------------------------------------
// Markdown table helpers
// ---------------------------------------------------------------------------

export function renderTable(headers: string[], rows: string[][]): string[] {
  const lines: string[] = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Name formatting
// ---------------------------------------------------------------------------

export function humanize(snakeName: string): string {
  return snakeName
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function toAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Section helpers
// ---------------------------------------------------------------------------

export function section(title: string, level: number = 2): string[] {
  const prefix = '#'.repeat(level);
  return ['', `${prefix} ${title}`, ''];
}

// ---------------------------------------------------------------------------
// Graph node helpers — shared across all doc-gen renderers
// ---------------------------------------------------------------------------

/**
 * Safely extract a typed array property from a module node.
 * Returns empty array if the property is missing or not an array.
 */
export function getArrayProp<T>(mod: ModuleNode, key: string): T[] {
  const val = (mod as Record<string, unknown>)[key];
  return Array.isArray(val) ? val as T[] : [];
}

/**
 * Extract the last segment of a dot-separated identifier.
 * e.g. `"board.board_strings.title"` → `"title"`
 */
export function shortName(id: string): string {
  const parts = id.split('.');
  /* v8 ignore next -- split always returns ≥1 element */
  return parts[parts.length - 1] ?? id;
}
