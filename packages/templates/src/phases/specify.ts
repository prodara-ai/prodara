// ---------------------------------------------------------------------------
// Prodara Templates — Specify Phase
// ---------------------------------------------------------------------------

import type { SpecifyContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Specify phase prompt for a given module. */
export function renderSpecify(ctx: SpecifyContext): string {
  const lines: string[] = [];

  lines.push(`# Specification Analysis: ${ctx.moduleName}`);
  lines.push('');
  lines.push('Analyze the following specification and identify all entities, workflows, edges, events, and constraints.');
  lines.push('');
  lines.push('## Specification');
  lines.push('');
  lines.push(ctx.specText);

  appendCommonContext(lines, ctx);

  return lines.join('\n');
}

function appendCommonContext(
  lines: string[],
  ctx: SpecifyContext,
): void {
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
  if (ctx.governance) {
    lines.push('');
    lines.push('## Governance Rules');
    lines.push('');
    lines.push(ctx.governance);
  }
  appendArtifactRules(lines, ctx);
}
