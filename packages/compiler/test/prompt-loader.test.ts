// ---------------------------------------------------------------------------
// Prompt loader tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadReviewerPrompt,
  loadReviewerPrompts,
  discoverCustomReviewers,
} from '../src/reviewers/prompt-loader.js';
import type { ResolvedReviewerConfig } from '../src/config/config.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'prodara-prompt-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const ENABLED: ResolvedReviewerConfig = { enabled: true, promptPath: null };

describe('loadReviewerPrompt', () => {
  it('returns null when no promptPath configured', () => {
    expect(loadReviewerPrompt(ENABLED, tempDir)).toBeNull();
  });

  it('returns null when promptPath file does not exist', () => {
    const cfg: ResolvedReviewerConfig = { enabled: true, promptPath: 'missing.md' };
    expect(loadReviewerPrompt(cfg, tempDir)).toBeNull();
  });

  it('reads prompt content from configured path', () => {
    const promptFile = join(tempDir, 'custom-arch.md');
    writeFileSync(promptFile, '# Custom Architecture Review\nFocus on DDD.', 'utf-8');
    const cfg: ResolvedReviewerConfig = { enabled: true, promptPath: 'custom-arch.md' };
    const content = loadReviewerPrompt(cfg, tempDir);
    expect(content).toContain('Custom Architecture Review');
    expect(content).toContain('Focus on DDD');
  });

  it('resolves relative path from project root', () => {
    mkdirSync(join(tempDir, '.prodara', 'reviewers'), { recursive: true });
    writeFileSync(join(tempDir, '.prodara', 'reviewers', 'arch.md'), 'Custom', 'utf-8');
    const cfg: ResolvedReviewerConfig = { enabled: true, promptPath: '.prodara/reviewers/arch.md' };
    expect(loadReviewerPrompt(cfg, tempDir)).toBe('Custom');
  });
});

describe('loadReviewerPrompts', () => {
  it('returns empty map when no prompts configured', () => {
    const configs: Record<string, ResolvedReviewerConfig> = {
      architecture: ENABLED,
      security: ENABLED,
    };
    const prompts = loadReviewerPrompts(configs, tempDir);
    expect(prompts.size).toBe(0);
  });

  it('loads prompts for all reviewers with promptPath', () => {
    writeFileSync(join(tempDir, 'arch.md'), 'Arch prompt', 'utf-8');
    writeFileSync(join(tempDir, 'sec.md'), 'Sec prompt', 'utf-8');
    const configs: Record<string, ResolvedReviewerConfig> = {
      architecture: { enabled: true, promptPath: 'arch.md' },
      security: { enabled: true, promptPath: 'sec.md' },
      codeQuality: ENABLED,
    };
    const prompts = loadReviewerPrompts(configs, tempDir);
    expect(prompts.size).toBe(2);
    expect(prompts.get('architecture')).toBe('Arch prompt');
    expect(prompts.get('security')).toBe('Sec prompt');
  });

  it('skips reviewers with missing prompt files', () => {
    const configs: Record<string, ResolvedReviewerConfig> = {
      architecture: { enabled: true, promptPath: 'missing.md' },
    };
    const prompts = loadReviewerPrompts(configs, tempDir);
    expect(prompts.size).toBe(0);
  });
});

describe('discoverCustomReviewers', () => {
  it('returns empty array when .prodara/reviewers/ does not exist', () => {
    expect(discoverCustomReviewers(tempDir)).toEqual([]);
  });

  it('discovers .md files as custom reviewers', () => {
    const reviewerDir = join(tempDir, '.prodara', 'reviewers');
    mkdirSync(reviewerDir, { recursive: true });
    writeFileSync(join(reviewerDir, 'performance.md'), '# Performance Review\nFocus on latency.', 'utf-8');
    writeFileSync(join(reviewerDir, 'accessibility.md'), '# Accessibility Review\nCheck WCAG.', 'utf-8');

    const reviewers = discoverCustomReviewers(tempDir);
    expect(reviewers).toHaveLength(2);

    const names = reviewers.map((r) => r.name);
    expect(names).toContain('performance');
    expect(names).toContain('accessibility');

    const perf = reviewers.find((r) => r.name === 'performance')!;
    expect(perf.promptContent).toContain('Focus on latency');
  });

  it('skips built-in reviewer names', () => {
    const reviewerDir = join(tempDir, '.prodara', 'reviewers');
    mkdirSync(reviewerDir, { recursive: true });
    writeFileSync(join(reviewerDir, 'architecture.md'), 'Override', 'utf-8');
    writeFileSync(join(reviewerDir, 'security.md'), 'Override', 'utf-8');
    writeFileSync(join(reviewerDir, 'custom-one.md'), 'Custom', 'utf-8');

    const reviewers = discoverCustomReviewers(tempDir);
    expect(reviewers).toHaveLength(1);
    expect(reviewers[0]!.name).toBe('custom-one');
  });

  it('ignores non-.md files', () => {
    const reviewerDir = join(tempDir, '.prodara', 'reviewers');
    mkdirSync(reviewerDir, { recursive: true });
    writeFileSync(join(reviewerDir, 'valid.md'), 'Valid', 'utf-8');
    writeFileSync(join(reviewerDir, 'notes.txt'), 'Ignored', 'utf-8');
    writeFileSync(join(reviewerDir, 'config.json'), '{}', 'utf-8');

    const reviewers = discoverCustomReviewers(tempDir);
    expect(reviewers).toHaveLength(1);
    expect(reviewers[0]!.name).toBe('valid');
  });
});
