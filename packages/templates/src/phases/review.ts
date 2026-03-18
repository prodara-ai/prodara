// ---------------------------------------------------------------------------
// Prodara Templates — Review Phase
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Review phase prompt for a named reviewer perspective. */
export function renderReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push(`# Code Review: ${ctx.reviewerName}`);
  lines.push(`Perspective: ${ctx.perspective}`);
  lines.push('');

  if (ctx.findings.length > 0) {
    lines.push(`## Current Findings (${ctx.findings.length})`);
    lines.push('');
    for (const f of ctx.findings) {
      const node = f.nodeId ? ` (${f.nodeId})` : '';
      lines.push(`### [${f.severity.toUpperCase()}] ${f.category}${node}`);
      lines.push(f.message);
      if (f.suggestion) {
        lines.push(`**Suggestion:** ${f.suggestion}`);
      }
      lines.push('');
    }
  }

  if (ctx.codeContext) {
    lines.push('## Code Context');
    lines.push('');
    lines.push(ctx.codeContext);
    lines.push('');
  }

  if (ctx.constitution) {
    lines.push('## Constitution');
    lines.push('');
    lines.push(ctx.constitution);
    lines.push('');
  }

  if (ctx.graphSlice) {
    lines.push('## Graph Context');
    lines.push('');
    lines.push(ctx.graphSlice);
    lines.push('');
  }

  appendArtifactRules(lines, ctx);

  return lines.join('\n');
}
