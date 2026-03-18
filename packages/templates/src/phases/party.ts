// ---------------------------------------------------------------------------
// Prodara Templates — Party Phase
// ---------------------------------------------------------------------------

import type { PartyContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Party phase prompt — multi-perspective discussion. */
export function renderParty(ctx: PartyContext): string {
  const lines: string[] = [];

  lines.push('# Party Mode');
  lines.push('');
  lines.push(`## Topic: ${ctx.topic}`);
  lines.push('');
  lines.push('Each perspective below provides its analysis. A synthesis section follows.');
  lines.push('');

  for (const p of ctx.perspectives) {
    lines.push(`### ${p.name}`);
    lines.push(`Role: ${p.role}`);
    lines.push('');
  }

  lines.push('## Synthesis');
  lines.push('');
  lines.push('Combine insights from all perspectives above into a unified recommendation.');

  if (ctx.constitution) {
    lines.push('');
    lines.push('## Constitution');
    lines.push('');
    lines.push(ctx.constitution);
  }

  if (ctx.graphSlice) {
    lines.push('');
    lines.push('## Graph Context');
    lines.push('');
    lines.push(ctx.graphSlice);
  }

  appendArtifactRules(lines, ctx);

  return lines.join('\n');
}
