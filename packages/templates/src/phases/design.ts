// ---------------------------------------------------------------------------
// Prodara Templates — Design Phase
// ---------------------------------------------------------------------------

import type { DesignContext } from '../types.js';
import { appendArtifactRules } from './helpers.js';

/** Render the Design phase prompt — per-change design document generation. */
export function renderDesign(ctx: DesignContext): string {
  const lines: string[] = [];

  lines.push('# Design Document');
  lines.push('');
  lines.push(`## Change: ${ctx.changeName}`);
  lines.push('');

  if (ctx.proposalSummary) {
    lines.push('## Proposal Summary');
    lines.push('');
    lines.push(ctx.proposalSummary);
    lines.push('');
  }

  lines.push('## Technical Approach');
  lines.push('');
  lines.push('Describe the technical strategy for implementing this change.');
  lines.push('');

  if (ctx.affectedModules.length > 0) {
    lines.push('## Affected Modules');
    lines.push('');
    for (const mod of ctx.affectedModules) {
      lines.push(`- ${mod}`);
    }
    lines.push('');
  }

  if (ctx.predictedFileChanges.length > 0) {
    lines.push('## Predicted File Changes');
    lines.push('');
    for (const file of ctx.predictedFileChanges) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (ctx.risks.length > 0) {
    lines.push('## Risk Assessment');
    lines.push('');
    for (const risk of ctx.risks) {
      lines.push(`- ${risk}`);
    }
    lines.push('');
  }

  if (ctx.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    for (const dep of ctx.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push('');
  }

  lines.push('## Architecture Decisions');
  lines.push('');
  lines.push('Document key architecture decisions and their rationale.');

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
