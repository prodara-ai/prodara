// ---------------------------------------------------------------------------
// Prodara Templates — Plan Phase
// ---------------------------------------------------------------------------

import type { PlanContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Plan phase prompt with tasks, changes, and impact. */
export function renderPlan(ctx: PlanContext): string {
  const lines: string[] = [];

  lines.push('# Execution Plan');
  lines.push('');

  if (ctx.changes.length > 0) {
    lines.push(`## Changes (${ctx.changes.length})`);
    lines.push('');
    for (const c of ctx.changes) {
      const detail = c.details ? ` — ${c.details}` : '';
      lines.push(`- **${c.changeKind}** \`${c.nodeId}\`${detail}`);
    }
    lines.push('');
  }

  if (ctx.impacts.length > 0) {
    lines.push(`## Impact Analysis (${ctx.impacts.length})`);
    lines.push('');
    for (const i of ctx.impacts) {
      lines.push(`- \`${i.nodeId}\` — ${i.reason} (via ${i.via}, depth ${i.depth})`);
    }
    lines.push('');
  }

  if (ctx.tasks.length > 0) {
    lines.push(`## Tasks (${ctx.tasks.length})`);
    lines.push('');
    for (const t of ctx.tasks) {
      lines.push(`- [${t.taskId}] **${t.action}** \`${t.nodeId}\` — ${t.reason}`);
    }
    lines.push('');
  }

  if (ctx.graphSlice) {
    lines.push('## Graph Context');
    lines.push('');
    lines.push(ctx.graphSlice);
  }

  appendArtifactRules(lines, ctx);

  return lines.join('\n');
}
