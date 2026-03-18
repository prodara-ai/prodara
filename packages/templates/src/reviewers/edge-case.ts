// ---------------------------------------------------------------------------
// Prodara Templates — Edge Case Hunter Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the edge case review. */
export const EDGE_CASE_PERSPECTIVE =
  'Systematically analyze every branching path for missing defaults, off-by-one errors, empty collections, null states, boundary values, and race conditions.';

/** Render edge case review prompt with methodical analysis perspective. */
export function renderEdgeCaseReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# Edge Case Review');
  lines.push('');
  lines.push(`Perspective: ${EDGE_CASE_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Check every decision point — is there a default/else path for unexpected values?');
  lines.push('2. Examine collections — what happens when they are empty, have one item, or overflow?');
  lines.push('3. Analyze boundaries — are min/max, first/last, and zero cases handled?');
  lines.push('4. Look for null/undefined states — can any field, reference, or result be absent?');
  lines.push('5. Identify race conditions — can concurrent workflows produce conflicting states?');
  lines.push('6. Check temporal dependencies — what happens if events arrive out of order?');
  lines.push('7. Verify idempotency — can operations be safely retried without side effects?');
  lines.push('8. Assess type boundaries — are numeric overflows, string lengths, and date ranges guarded?');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
