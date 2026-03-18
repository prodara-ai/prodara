// ---------------------------------------------------------------------------
// Prodara Templates — Copilot Platform Adapter
// ---------------------------------------------------------------------------

import type { PlatformOutput } from '../types.js';

/** Default output directory for Copilot prompt files. */
export const COPILOT_DIR = '.github/prompts';
/** File extension for Copilot prompt files. */
export const COPILOT_EXT = '.prompt.md';

/** Wrap rendered content with Copilot YAML frontmatter. */
export function wrapCopilot(content: string, capability: string): PlatformOutput {
  const safeCap = capability.replace(/[\n\r"]/g, '');
  const lines: string[] = [];
  lines.push('---');
  lines.push(`mode: ${safeCap}`);
  lines.push('tools: []');
  lines.push('---');
  lines.push('');
  lines.push(content);

  return {
    content: lines.join('\n'),
    suggestedPath: `${COPILOT_DIR}/prodara-${safeCap}${COPILOT_EXT}`,
    extension: COPILOT_EXT,
  };
}
