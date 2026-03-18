// ---------------------------------------------------------------------------
// Prodara Templates — Implement Phase
// ---------------------------------------------------------------------------

import type { ImplementContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Implement phase prompt for a specific task. */
export function renderImplement(ctx: ImplementContext): string {
  const lines: string[] = [];

  lines.push(`# Implementation Task: ${ctx.taskId}`);
  lines.push(`Action: ${ctx.action} | Node: ${ctx.nodeId} (${ctx.nodeKind}) | Module: ${ctx.module}`);
  lines.push('');

  lines.push('## Context');
  lines.push(ctx.reason);
  lines.push('');

  if (ctx.fieldDefinitions.length > 0) {
    lines.push('## Field Definitions');
    for (const f of ctx.fieldDefinitions) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  if (ctx.relatedEdges.length > 0) {
    lines.push('## Related Edges');
    for (const e of ctx.relatedEdges) {
      lines.push(`- ${e}`);
    }
    lines.push('');
  }

  if (ctx.governanceRules.length > 0) {
    lines.push('## Governance Rules');
    for (const r of ctx.governanceRules) {
      lines.push(`- [${r.category}] ${r.rule}`);
    }
    lines.push('');
  }

  if (ctx.preserveSeams) {
    lines.push('## Seam Preservation');
    lines.push('Preserve any user code between `// PRODARA SEAM START <id>` and `// PRODARA SEAM END <id>` markers.');
    lines.push('Do not modify or remove seam-protected sections.');
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

  if (ctx.governance) {
    lines.push('## Governance');
    lines.push('');
    lines.push(ctx.governance);
    lines.push('');
  }

  appendArtifactRules(lines, ctx);

  return lines.join('\n');
}
