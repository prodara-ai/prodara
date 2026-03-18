// ---------------------------------------------------------------------------
// Prodara Compiler — Reviewers (public API)
// ---------------------------------------------------------------------------

export type { ReviewerAgent, ReviewFixLoopOptions } from './reviewer.js';
export { runReviewers, runReviewFixLoop, runReviewFixLoopAsync, buildFixPrompt, runFixAttempt } from './reviewer.js';
export type { FindingSeverity, ReviewFinding, ReviewResult, ReviewCycleResult, FixAttemptResult } from './types.js';
export { loadReviewerPrompt, loadReviewerPrompts, discoverCustomReviewers } from './prompt-loader.js';
export type { CustomReviewerDefinition } from './prompt-loader.js';
export { architectureReviewer } from './architecture.js';
export { qualityReviewer } from './quality.js';
export { codeQualityReviewer } from './code-quality.js';
export { specificationReviewer } from './specification.js';
export { uxReviewer } from './ux.js';
export { securityReviewer } from './security.js';
export { testQualityReviewer } from './test-quality.js';
export { adversarialReviewer } from './adversarial.js';
export { edgeCaseReviewer } from './edge-case.js';

import type { ReviewerAgent } from './reviewer.js';
import { architectureReviewer } from './architecture.js';
import { qualityReviewer } from './quality.js';
import { codeQualityReviewer } from './code-quality.js';
import { specificationReviewer } from './specification.js';
import { uxReviewer } from './ux.js';
import { securityReviewer } from './security.js';
import { testQualityReviewer } from './test-quality.js';
import { adversarialReviewer } from './adversarial.js';
import { edgeCaseReviewer } from './edge-case.js';

/**
 * Default set of built-in reviewer agents, in recommended execution order.
 * Adversarial and edge-case reviewers are included but disabled by default.
 */
export const DEFAULT_REVIEWERS: readonly ReviewerAgent[] = [
  architectureReviewer,
  qualityReviewer,
  codeQualityReviewer,
  specificationReviewer,
  uxReviewer,
  securityReviewer,
  testQualityReviewer,
  adversarialReviewer,
  edgeCaseReviewer,
];
