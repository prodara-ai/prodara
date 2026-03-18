// ---------------------------------------------------------------------------
// Prodara Templates — Adversarial Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the adversarial review. */
export const ADVERSARIAL_PERSPECTIVE =
  'Assume problems exist. Exhaustively find gaps, unstated assumptions, contradictions, missing items, and anything that could go wrong.';

/** Render adversarial review prompt with cynical/skeptical perspective. */
export function renderAdversarialReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# Adversarial Review');
  lines.push('');
  lines.push(`Perspective: ${ADVERSARIAL_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Challenge every assumption — what is taken for granted that could be wrong?');
  lines.push('2. Find gaps in the specification — what is missing that should be explicitly stated?');
  lines.push('3. Identify contradictions — do any declarations conflict with each other?');
  lines.push('4. Look for unstated dependencies — what implicit requirements are not declared?');
  lines.push('5. Question completeness — are there scenarios, actors, or data flows not covered?');
  lines.push('6. Find ambiguities — where can the spec be interpreted in multiple ways?');
  lines.push('7. Evaluate error scenarios — what failure modes are unaddressed?');
  lines.push('8. Check for security blind spots — what attack vectors are not considered?');
  lines.push('9. Assess scalability gaps — what happens at 10x or 100x the expected load?');
  lines.push('10. Verify naming consistency — are terms used consistently across the entire spec?');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
