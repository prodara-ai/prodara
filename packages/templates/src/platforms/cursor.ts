// ---------------------------------------------------------------------------
// Prodara Templates — Cursor Platform Adapter
// ---------------------------------------------------------------------------

import type { PlatformOutput } from '../types.js';

/** Default output directory for Cursor rule files. */
export const CURSOR_DIR = '.cursor/rules';
/** File extension for Cursor rule files. */
export const CURSOR_EXT = '.mdc';

/** Wrap rendered content with Cursor YAML frontmatter. */
export function wrapCursor(content: string, capability: string): PlatformOutput {
  const safeCap = capability.replace(/[\n\r"]/g, '');
  const lines: string[] = [];
  lines.push('---');
  lines.push(`description: Prodara ${safeCap} phase`);
  lines.push('globs: ["**/*.prd"]');
  lines.push('---');
  lines.push('');
  lines.push(content);

  return {
    content: lines.join('\n'),
    suggestedPath: `${CURSOR_DIR}/prodara-${safeCap}${CURSOR_EXT}`,
    extension: CURSOR_EXT,
  };
}
