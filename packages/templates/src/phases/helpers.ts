// ---------------------------------------------------------------------------
// Prodara Templates — Shared Phase Helpers
// ---------------------------------------------------------------------------

import type { PhaseContext } from '../types.js';

/** Append artifact rules section to output lines if present. */
export function appendArtifactRules(lines: string[], ctx: PhaseContext): void {
  if (ctx.artifactRules && ctx.artifactRules.length > 0) {
    lines.push('');
    lines.push('## Artifact Rules');
    lines.push('');
    for (const rule of ctx.artifactRules) {
      lines.push(`- ${rule}`);
    }
  }
}
