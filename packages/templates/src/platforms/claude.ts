// ---------------------------------------------------------------------------
// Prodara Templates — Claude Platform Adapter
// ---------------------------------------------------------------------------

import type { PlatformOutput } from '../types.js';

/** Default output directory for Claude command files. */
export const CLAUDE_DIR = '.claude/commands';
/** File extension for Claude command files. */
export const CLAUDE_EXT = '.md';

/** Wrap rendered content for Claude (pass-through with suggested path). */
export function wrapClaude(content: string, capability: string): PlatformOutput {
  return {
    content,
    suggestedPath: `${CLAUDE_DIR}/prodara-${capability}${CLAUDE_EXT}`,
    extension: CLAUDE_EXT,
  };
}
