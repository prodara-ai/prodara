// ---------------------------------------------------------------------------
// Prodara Templates — Help Phase
// ---------------------------------------------------------------------------

import type { HelpContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Help phase prompt — contextual guidance based on project state. */
export function renderHelp(ctx: HelpContext): string {
  const lines: string[] = [];

  lines.push('# Prodara Help');
  lines.push('');

  lines.push('## Project State');
  lines.push('');
  lines.push(`- .prd files: **${ctx.prdFileCount}**`);
  lines.push(`- Build artifacts: **${ctx.hasBuild ? 'present' : 'none'}**`);

  if (ctx.modules.length > 0) {
    lines.push(`- Modules: ${ctx.modules.join(', ')}`);
  }
  lines.push('');

  if (ctx.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of ctx.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  if (ctx.constitution) {
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
