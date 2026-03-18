// ---------------------------------------------------------------------------
// Prodara Templates — Test Quality Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the test quality review. */
export const TEST_QUALITY_PERSPECTIVE =
  'Evaluate test coverage completeness, test quality, and identification of missing edge cases.';

/** Render test quality review prompt evaluating coverage and edge cases. */
export function renderTestQualityReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# Test Quality Review');
  lines.push('');
  lines.push(`Perspective: ${TEST_QUALITY_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Verify every entity has at least one associated test declaration.');
  lines.push('2. Check that workflows are tested for both success and failure paths.');
  lines.push('3. Identify missing edge case tests (boundary values, empty inputs, error states).');
  lines.push('4. Flag tests that are fragile or tightly coupled to implementation details.');
  lines.push('5. Ensure test names clearly describe the scenario being verified.');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
