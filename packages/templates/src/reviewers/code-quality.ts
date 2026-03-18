// ---------------------------------------------------------------------------
// Prodara Templates — Code Quality Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the code quality review. */
export const CODE_QUALITY_PERSPECTIVE =
  'Assess code clarity, consistency, naming conventions, complexity, and adherence to best practices.';

/** Render code quality review prompt assessing clarity, naming, and complexity. */
export function renderCodeQualityReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# Code Quality Review');
  lines.push('');
  lines.push(`Perspective: ${CODE_QUALITY_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Check naming conventions — entities, fields, and workflows should follow declared patterns.');
  lines.push('2. Identify overly complex workflows (excessive branching, deep nesting).');
  lines.push('3. Flag duplicated logic that should be extracted into shared entities or edges.');
  lines.push('4. Verify error handling patterns are consistent across modules.');
  lines.push('5. Ensure generated code follows language-idiomatic patterns.');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
