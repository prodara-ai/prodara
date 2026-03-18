// ---------------------------------------------------------------------------
// Prodara Templates — Codex Platform Adapter
// ---------------------------------------------------------------------------

import type { PlatformOutput } from '../types.js';

/** Default output directory for Codex agent files. */
export const CODEX_DIR = '.codex';
/** File extension for Codex agent files. */
export const CODEX_EXT = '.md';

/** Wrap rendered content for Codex (pass-through with suggested path). */
export function wrapCodex(content: string, capability: string): PlatformOutput {
  return {
    content,
    suggestedPath: `${CODEX_DIR}/prodara-${capability}${CODEX_EXT}`,
    extension: CODEX_EXT,
  };
}
