// ---------------------------------------------------------------------------
// Prodara Compiler — Reviewer Prompt Loader
// ---------------------------------------------------------------------------
// Loads custom reviewer prompts from `.md` files referenced by `promptPath`
// in the reviewer configuration, and discovers custom reviewers from the
// `.prodara/reviewers/` directory.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import type { ResolvedReviewerConfig } from '../config/config.js';

/**
 * Load a custom prompt file for a reviewer.
 * Returns the file content or `null` if no promptPath is configured or file is missing.
 */
export function loadReviewerPrompt(
  config: ResolvedReviewerConfig,
  root: string,
): string | null {
  if (!config.promptPath) return null;

  const resolved = join(root, config.promptPath);
  if (!existsSync(resolved)) return null;

  return readFileSync(resolved, 'utf-8');
}

/**
 * Load custom prompts for all configured reviewers.
 * Returns a map of reviewer name → prompt content.
 */
export function loadReviewerPrompts(
  configs: Readonly<Record<string, ResolvedReviewerConfig | undefined>>,
  root: string,
): ReadonlyMap<string, string> {
  const prompts = new Map<string, string>();

  for (const [name, cfg] of Object.entries(configs)) {
    /* v8 ignore next -- config entries are always defined */
    if (!cfg) continue;
    const content = loadReviewerPrompt(cfg, root);
    if (content) {
      prompts.set(name, content);
    }
  }

  return prompts;
}

/** Names of built-in reviewers (not discovered from disk). */
const BUILT_IN_REVIEWERS = new Set([
  'architecture',
  'quality',
  'codeQuality',
  'specification',
  'ux',
  'security',
  'testQuality',
]);

/**
 * Discovered custom reviewer from the `.prodara/reviewers/` directory.
 */
export interface CustomReviewerDefinition {
  readonly name: string;
  readonly promptContent: string;
}

/**
 * Discover custom reviewers from `.prodara/reviewers/` directory.
 * Each `.md` file not matching a built-in reviewer name becomes a custom reviewer.
 */
export function discoverCustomReviewers(root: string): readonly CustomReviewerDefinition[] {
  const reviewerDir = join(root, '.prodara', 'reviewers');
  if (!existsSync(reviewerDir)) return [];

  const files = readdirSync(reviewerDir).filter((f) => extname(f) === '.md');
  const results: CustomReviewerDefinition[] = [];

  for (const file of files) {
    const name = basename(file, '.md');
    if (BUILT_IN_REVIEWERS.has(name)) continue;

    const content = readFileSync(join(reviewerDir, file), 'utf-8');
    results.push({ name, promptContent: content });
  }

  return results;
}
