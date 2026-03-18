// ---------------------------------------------------------------------------
// Prodara Templates — Explore Phase
// ---------------------------------------------------------------------------

import type { ExploreContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Explore phase prompt — read-only investigation of a topic. */
export function renderExplore(ctx: ExploreContext): string {
  const lines: string[] = [];

  lines.push('# Exploration');
  lines.push('');
  lines.push(`## Topic: ${ctx.topic}`);
  lines.push('');
  lines.push('Analyze the current product graph and specification to explore this topic.');
  lines.push('This is a **read-only investigation** — no files should be modified.');
  lines.push('');

  if (ctx.modules.length > 0) {
    lines.push('## Relevant Modules');
    lines.push('');
    for (const mod of ctx.modules) {
      lines.push(`- ${mod}`);
    }
    lines.push('');
  }

  if (ctx.relatedEntities.length > 0) {
    lines.push('## Related Entities');
    lines.push('');
    for (const entity of ctx.relatedEntities) {
      lines.push(`- ${entity}`);
    }
    lines.push('');
  }

  lines.push('## Guidelines');
  lines.push('');
  lines.push('1. Understand existing entities, workflows, and relationships');
  lines.push('2. Suggest possible approaches or enhancements');
  lines.push('3. Highlight trade-offs and considerations');
  lines.push('4. Identify affected modules and dependencies');

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
