// ---------------------------------------------------------------------------
// Prodara Templates — Clarify Phase
// ---------------------------------------------------------------------------

import type { ClarifyContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Clarify phase prompt with open questions. */
export function renderClarify(ctx: ClarifyContext): string {
  const lines: string[] = [];

  lines.push('# Clarification Required');
  lines.push('');
  lines.push(`Ambiguity threshold: **${ctx.threshold}**`);
  lines.push('');
  lines.push(`The following ${ctx.questions.length} question(s) need resolution:`);
  lines.push('');

  for (const q of ctx.questions) {
    lines.push(`## ${q.id}: ${q.text}`);
    lines.push(`Confidence: ${q.confidence}`);
    if (q.options.length > 0) {
      lines.push('Options:');
      for (const opt of q.options) {
        lines.push(`- ${opt}`);
      }
    }
    lines.push('');
  }

  if (ctx.constitution) {
    lines.push('## Constitution');
    lines.push('');
    lines.push(ctx.constitution);
  }

  if (ctx.graphSlice) {
    lines.push('## Graph Context');
    lines.push('');
    lines.push(ctx.graphSlice);
  }

  appendArtifactRules(lines, ctx);

  return lines.join('\n');
}
