// ---------------------------------------------------------------------------
// Prodara Templates — Shared Reviewer Helpers
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';

/** Append existing findings section to the output lines. */
export function appendFindings(lines: string[], ctx: ReviewContext): void {
  if (ctx.findings.length > 0) {
    lines.push('');
    lines.push(`## Existing Findings (${ctx.findings.length})`);
    lines.push('');
    for (const f of ctx.findings) {
      lines.push(`- [${f.severity.toUpperCase()}] ${f.category}: ${f.message}`);
    }
  }
}

/** Append code context, custom prompt, constitution, and graph slice sections. */
export function appendContext(lines: string[], ctx: ReviewContext): void {
  if (ctx.customPrompt) {
    lines.push('');
    lines.push('## Custom Instructions');
    lines.push('');
    lines.push(ctx.customPrompt);
  }
  if (ctx.codeContext) {
    lines.push('');
    lines.push('## Code Context');
    lines.push('');
    lines.push(ctx.codeContext);
  }
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
}
