// ---------------------------------------------------------------------------
// Prodara Templates — OpenCode Platform Adapter
// ---------------------------------------------------------------------------

import type { PlatformOutput } from '../types.js';

/** Default output directory for OpenCode agent files. */
export const OPENCODE_DIR = '.opencode/agent';
/** File extension for OpenCode agent files. */
export const OPENCODE_EXT = '.md';

/** Wrap rendered content for OpenCode (pass-through with suggested path). */
export function wrapOpencode(content: string, capability: string): PlatformOutput {
  return {
    content,
    suggestedPath: `${OPENCODE_DIR}/prodara-${capability}${OPENCODE_EXT}`,
    extension: OPENCODE_EXT,
  };
}
