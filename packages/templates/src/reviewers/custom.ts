// ---------------------------------------------------------------------------
// Prodara Templates — Custom Reviewer
// ---------------------------------------------------------------------------
// Renders a review prompt from user-provided custom prompt content.

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Render a custom reviewer prompt using user-provided instructions. */
export function renderCustomReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push(`# ${ctx.reviewerName} Review`);
  lines.push('');
  lines.push(`Perspective: ${ctx.perspective}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');

  if (ctx.customPrompt) {
    lines.push(ctx.customPrompt);
  } else {
    lines.push('Perform a thorough review from the stated perspective.');
  }

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
