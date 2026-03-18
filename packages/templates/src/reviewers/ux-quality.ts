// ---------------------------------------------------------------------------
// Prodara Templates — UX Quality Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the UX quality review. */
export const UX_QUALITY_PERSPECTIVE =
  'Assess user experience quality including accessibility, keyboard navigation, screen reader support, and consistent interaction patterns.';

/** Render UX quality review prompt checking accessibility and interaction patterns. */
export function renderUxQualityReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# UX Quality Review');
  lines.push('');
  lines.push(`Perspective: ${UX_QUALITY_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Verify all interactive elements have accessible labels and ARIA attributes.');
  lines.push('2. Check keyboard navigation flow — every action reachable without a mouse.');
  lines.push('3. Ensure color contrast meets WCAG 2.1 AA standards.');
  lines.push('4. Validate that loading and error states provide clear user feedback.');
  lines.push('5. Flag inconsistent interaction patterns across workflows.');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
