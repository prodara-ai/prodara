// ---------------------------------------------------------------------------
// Prodara Templates — Fix Phase
// ---------------------------------------------------------------------------

import type { FixContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Fix phase prompt listing actionable findings filtered by severity. */
export function renderFix(ctx: FixContext): string {
  const actionable = ctx.findings.filter((f) => ctx.fixSeverity.includes(f.severity));

  const lines: string[] = [];

  lines.push('# Fix Request');
  lines.push('');

  if (actionable.length === 0) {
    lines.push('No actionable findings to fix.');
    return lines.join('\n');
  }

  lines.push(`The following ${actionable.length} finding(s) require fixes:`);
  lines.push('');

  for (const f of actionable) {
    const node = f.nodeId ? `\nNode: ${f.nodeId}` : '';
    lines.push(`## [${f.severity.toUpperCase()}] ${f.category}${node}`);
    lines.push(f.message);
    if (f.suggestion) {
      lines.push(`Suggestion: ${f.suggestion}`);
    }
    lines.push('');
  }

  lines.push('Apply fixes that resolve these findings without introducing regressions.');

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
