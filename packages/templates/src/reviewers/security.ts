// ---------------------------------------------------------------------------
// Prodara Templates — Security Reviewer
// ---------------------------------------------------------------------------

import type { ReviewContext } from '../types.js';
import { appendFindings, appendContext } from './helpers.js';

/** Perspective statement guiding the security review. */
export const SECURITY_PERSPECTIVE =
  'Identify authorization gaps, credential exposure, injection surfaces, and missing access controls.';

/** Render security review prompt checking auth, credentials, and injection surfaces. */
export function renderSecurityReview(ctx: ReviewContext): string {
  const lines: string[] = [];

  lines.push('# Security Review');
  lines.push('');
  lines.push(`Perspective: ${SECURITY_PERSPECTIVE}`);
  lines.push('');
  lines.push('## Instructions');
  lines.push('');
  lines.push('1. Check all write operations for proper authorization (authorized_as edges).');
  lines.push('2. Identify entities with sensitive fields (password, token, secret, api_key, credit_card, ssn) that lack access controls.');
  lines.push('3. Verify that published events carry authorization context.');
  lines.push('4. Flag any direct user input flowing to queries or commands without validation.');
  lines.push('5. Ensure credentials are never stored in plaintext or logged.');

  appendFindings(lines, ctx);
  appendContext(lines, ctx);

  return lines.join('\n');
}
