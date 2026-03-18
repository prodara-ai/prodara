// ---------------------------------------------------------------------------
// Prodara Templates — Architecture Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the architecture review. */
export const ARCHITECTURE_PERSPECTIVE =
  'Evaluate module boundaries, dependency direction, separation of concerns, and adherence to declared architecture constraints.';

/** Render architecture review prompt with module boundary and dependency checks. */
export function renderArchitectureReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# Architecture Review');
  lines.push('');
  lines.push(`Perspective: ${ARCHITECTURE_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Verify that module boundaries match the declared architecture in the constitution.');
  lines.push('2. Check that dependency edges flow in the correct direction (no circular dependencies).');
  lines.push('3. Ensure entities are not directly accessed across module boundaries without a declared edge.');
  lines.push('4. Flag any violation of separation of concerns (e.g., UI logic in data modules).');
  lines.push('5. Confirm that interfaces between modules are minimal and well-defined.');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
