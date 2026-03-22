// ---------------------------------------------------------------------------
// Config module tests
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig, resolveConfig, priorityRank, CONFIG_FILENAME, DEFAULT_CONFIG,
} from '../src/config/config.js';
import type { QuestionPriority } from '../src/config/config.js';

const TEST_DIR = join(tmpdir(), `prodara-config-test-${process.pid}`);

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe('loadConfig', () => {
  it('returns defaults when no config file exists', () => {
    const result = loadConfig(TEST_DIR);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.warnings).toHaveLength(0);
  });

  it('loads a minimal empty config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), '{}', 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.warnings).toHaveLength(0);
  });

  it('loads a config with phase overrides', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      phases: { clarify: { maxQuestions: 5, minimumQuestionPriority: 'high' } },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.phases.clarify.maxQuestions).toBe(5);
    expect(result.config.phases.clarify.minimumQuestionPriority).toBe('high');
    expect(result.warnings).toHaveLength(0);
  });

  it('loads a config with reviewFix overrides', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      reviewFix: { maxIterations: 5 },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.reviewFix.maxIterations).toBe(5);
  });

  it('loads a config with reviewer overrides', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      reviewers: {
        architecture: { enabled: false },
        uxQuality: { promptPath: 'prompts/ux.txt' },
      },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.reviewers.architecture.enabled).toBe(false);
    expect(result.config.reviewers.uxQuality.promptPath).toBe('prompts/ux.txt');
    expect(result.config.reviewers.security.enabled).toBe(true);
  });

  it('warns on unknown top-level keys', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      unknown: true,
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings).toContain('Unknown config key: "unknown"');
  });

  it('warns on unknown phase keys', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      phases: { unknown: {} },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings).toContain('Unknown phase: "unknown"');
  });

  it('handles malformed JSON gracefully', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), 'not{json', 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/Failed to parse/);
  });

  it('handles non-object JSON', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), '"string"', 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('handles array JSON', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), '[]', 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.warnings).toContain(`${CONFIG_FILENAME} must be a JSON object; using defaults`);
  });

  it('warns on invalid maxQuestions', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      phases: { clarify: { maxQuestions: -1 } },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.phases.clarify.maxQuestions).toBe(DEFAULT_CONFIG.phases.clarify.maxQuestions);
    expect(result.warnings).toContain('phases.clarify.maxQuestions must be a positive integer');
  });

  it('warns on invalid minimumQuestionPriority', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      phases: { clarify: { minimumQuestionPriority: 'invalid' } },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.phases.clarify.minimumQuestionPriority).toBe('medium');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('supports custom reviewer entries', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      reviewers: { custom: { enabled: true, promptPath: 'custom.txt' } },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.reviewers['custom']?.enabled).toBe(true);
    expect(result.config.reviewers['custom']?.promptPath).toBe('custom.txt');
  });

  it('loads validation commands', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      validation: { lint: 'npm run lint', test: 'npm test' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.validation.lint).toBe('npm run lint');
    expect(result.config.validation.test).toBe('npm test');
    expect(result.config.validation.typecheck).toBeNull();
    expect(result.config.validation.build).toBeNull();
  });

  it('warns on unknown validation keys', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      validation: { unknown: 'cmd' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings).toContain('Unknown validation key: "unknown"');
  });

  it('loads agent config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      agent: { platforms: ['claude', 'cursor'], provider: 'anthropic' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.agent.platforms).toEqual(['claude', 'cursor']);
    expect(result.config.agent.provider).toBe('anthropic');
  });

  it('warns on invalid agent platforms', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      agent: { platforms: ['invalid'] },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.config.agent.platforms).toEqual(['copilot']);
  });

  it('warns on invalid agent provider', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      agent: { provider: 'invalid' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.config.agent.provider).toBeNull();
  });

  it('loads agent defaultModel and apiKey', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      agent: { defaultModel: 'gpt-4o', apiKey: 'sk-test-123' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.agent.defaultModel).toBe('gpt-4o');
    expect(result.config.agent.apiKey).toBe('sk-test-123');
  });

  it('treats empty agent defaultModel and apiKey as null', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      agent: { defaultModel: '', apiKey: '' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.agent.defaultModel).toBeNull();
    expect(result.config.agent.apiKey).toBeNull();
  });

  it('loads agent maxImplementRetries', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      agent: { maxImplementRetries: 3 },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.agent.maxImplementRetries).toBe(3);
  });

  it('loads audit config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      audit: { enabled: false, path: 'logs/' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.audit.enabled).toBe(false);
    expect(result.config.audit.path).toBe('logs/');
  });

  it('loads reviewFix with fixSeverity and parallel', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      reviewFix: { maxIterations: 5, fixSeverity: ['critical'], parallel: false },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.reviewFix.maxIterations).toBe(5);
    expect(result.config.reviewFix.fixSeverity).toEqual(['critical']);
    expect(result.config.reviewFix.parallel).toBe(false);
  });

  it('loads constitution config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      constitution: { path: '.prodara/constitution.md' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.constitution.path).toBe('.prodara/constitution.md');
  });

  it('returns null constitution path when not configured', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), '{}', 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.constitution.path).toBeNull();
  });

  it('loads templateOverrides config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      templateOverrides: { 'phase:specify': '.prodara/templates/specify.md' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.templateOverrides['phase:specify']).toBe('.prodara/templates/specify.md');
  });

  it('ignores non-string templateOverride values', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      templateOverrides: { 'phase:specify': 123, 'phase:plan': '' },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.templateOverrides['phase:specify']).toBeUndefined();
    expect(result.config.templateOverrides['phase:plan']).toBeUndefined();
  });

  it('loads artifactRules config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      artifactRules: {
        proposal: ['Must include rationale', 'Must reference existing entities'],
        design: ['Must include sequence diagram'],
      },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.artifactRules['proposal']).toEqual([
      'Must include rationale',
      'Must reference existing entities',
    ]);
    expect(result.config.artifactRules['design']).toEqual(['Must include sequence diagram']);
  });

  it('filters non-string artifactRules values', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      artifactRules: { proposal: ['valid', 123, true] },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.artifactRules['proposal']).toEqual(['valid']);
  });

  it('warns on invalid fixSeverity values', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      reviewFix: { fixSeverity: ['invalid'] },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.config.reviewFix.fixSeverity).toEqual(['critical', 'error']);
  });

  it('loads ambiguityThreshold override', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      phases: { clarify: { ambiguityThreshold: 'high' } },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.phases.clarify.ambiguityThreshold).toBe('high');
  });

  it('warns on invalid ambiguityThreshold', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      phases: { clarify: { ambiguityThreshold: 'invalid' } },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.phases.clarify.ambiguityThreshold).toBe('medium');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('resolveConfig', () => {
  it('resolves empty object to defaults', () => {
    const result = resolveConfig({});
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.warnings).toHaveLength(0);
  });

  it('merges phase agent/model', () => {
    const result = resolveConfig({
      phases: { specify: { agent: 'claude', model: 'opus' } },
    });
    expect(result.config.phases.specify.agent).toBe('claude');
    expect(result.config.phases.specify.model).toBe('opus');
    expect(result.config.phases.plan.agent).toBe('default');
  });

  it('resolves preReview config', () => {
    const result = resolveConfig({
      preReview: { enabled: true, maxIterations: 5 },
    });
    expect(result.config.preReview.enabled).toBe(true);
    expect(result.config.preReview.maxIterations).toBe(5);
    expect(result.config.preReview.fixSeverity).toEqual(['critical', 'error']);
  });

  it('resolves preReview fixSeverity array', () => {
    const result = resolveConfig({
      preReview: { fixSeverity: ['warning', 'critical'] },
    });
    expect(result.config.preReview.fixSeverity).toEqual(['warning', 'critical']);
  });

  it('resolves docs with custom outputDir', () => {
    const result = resolveConfig({
      docs: { enabled: true, outputDir: 'custom-docs' },
    });
    expect(result.config.docs.enabled).toBe(true);
    expect(result.config.docs.outputDir).toBe('custom-docs');
  });

  it('resolves docs with invalid enabled and empty outputDir', () => {
    const result = resolveConfig({
      docs: { enabled: 'yes', outputDir: '' },
    });
    // Falls back to defaults when types don't match
    expect(typeof result.config.docs.enabled).toBe('boolean');
    expect(result.config.docs.outputDir).not.toBe('');
  });

  it('accepts postReview as alias for reviewFix', () => {
    const result = resolveConfig({
      postReview: { maxIterations: 7 },
    });
    expect(result.config.reviewFix.maxIterations).toBe(7);
  });
});

describe('priorityRank', () => {
  it('returns 0 for low', () => {
    expect(priorityRank('low')).toBe(0);
  });

  it('returns 1 for medium', () => {
    expect(priorityRank('medium')).toBe(1);
  });

  it('returns 2 for high', () => {
    expect(priorityRank('high')).toBe(2);
  });

  it('returns 3 for critical', () => {
    expect(priorityRank('critical')).toBe(3);
  });

  it('maintains ascending order', () => {
    const priorities: QuestionPriority[] = ['low', 'medium', 'high', 'critical'];
    for (let i = 1; i < priorities.length; i++) {
      expect(priorityRank(priorities[i]!)).toBeGreaterThan(priorityRank(priorities[i - 1]!));
    }
  });
});

describe('DEFAULT_CONFIG', () => {
  it('has all built-in reviewer names', () => {
    expect(DEFAULT_CONFIG.reviewers.architecture).toBeDefined();
    expect(DEFAULT_CONFIG.reviewers.security).toBeDefined();
    expect(DEFAULT_CONFIG.reviewers.codeQuality).toBeDefined();
    expect(DEFAULT_CONFIG.reviewers.testQuality).toBeDefined();
    expect(DEFAULT_CONFIG.reviewers.uxQuality).toBeDefined();
    expect(DEFAULT_CONFIG.reviewers.adversarial).toBeDefined();
    expect(DEFAULT_CONFIG.reviewers.edgeCase).toBeDefined();
  });

  it('has adversarial and edgeCase disabled by default', () => {
    expect(DEFAULT_CONFIG.reviewers.adversarial!.enabled).toBe(false);
    expect(DEFAULT_CONFIG.reviewers.edgeCase!.enabled).toBe(false);
  });

  it('has all phase names', () => {
    expect(DEFAULT_CONFIG.phases.specify).toBeDefined();
    expect(DEFAULT_CONFIG.phases.clarify).toBeDefined();
    expect(DEFAULT_CONFIG.phases.plan).toBeDefined();
    expect(DEFAULT_CONFIG.phases.tasks).toBeDefined();
    expect(DEFAULT_CONFIG.phases.analyze).toBeDefined();
    expect(DEFAULT_CONFIG.phases.implement).toBeDefined();
    expect(DEFAULT_CONFIG.phases.review).toBeDefined();
    expect(DEFAULT_CONFIG.phases.fix).toBeDefined();
  });

  it('has sensible clarify defaults', () => {
    expect(DEFAULT_CONFIG.phases.clarify.maxQuestions).toBe(10);
    expect(DEFAULT_CONFIG.phases.clarify.minimumQuestionPriority).toBe('medium');
  });

  it('has sensible reviewFix defaults', () => {
    expect(DEFAULT_CONFIG.reviewFix.maxIterations).toBe(3);
    expect(DEFAULT_CONFIG.reviewFix.fixSeverity).toEqual(['critical', 'error']);
    expect(DEFAULT_CONFIG.reviewFix.parallel).toBe(true);
  });

  it('has sensible validation defaults', () => {
    expect(DEFAULT_CONFIG.validation.lint).toBeNull();
    expect(DEFAULT_CONFIG.validation.typecheck).toBeNull();
    expect(DEFAULT_CONFIG.validation.test).toBeNull();
    expect(DEFAULT_CONFIG.validation.build).toBeNull();
  });

  it('has sensible agent defaults', () => {
    expect(DEFAULT_CONFIG.agent.platforms).toEqual(['copilot']);
    expect(DEFAULT_CONFIG.agent.defaultModel).toBeNull();
    expect(DEFAULT_CONFIG.agent.apiKey).toBeNull();
    expect(DEFAULT_CONFIG.agent.provider).toBeNull();
  });

  it('has sensible audit defaults', () => {
    expect(DEFAULT_CONFIG.audit.enabled).toBe(true);
    expect(DEFAULT_CONFIG.audit.path).toBe('.prodara/runs/');
  });

  it('has sensible preReview defaults', () => {
    expect(DEFAULT_CONFIG.preReview.enabled).toBe(false);
    expect(DEFAULT_CONFIG.preReview.maxIterations).toBe(2);
    expect(DEFAULT_CONFIG.preReview.fixSeverity).toEqual(['critical', 'error']);
  });

  it('has sensible constitution defaults', () => {
    expect(DEFAULT_CONFIG.constitution.path).toBeNull();
  });

  it('has sensible templateOverrides defaults', () => {
    expect(DEFAULT_CONFIG.templateOverrides).toEqual({});
  });

  it('has sensible artifactRules defaults', () => {
    expect(DEFAULT_CONFIG.artifactRules).toEqual({});
  });

  it('has ambiguityThreshold default', () => {
    expect(DEFAULT_CONFIG.phases.clarify.ambiguityThreshold).toBe('medium');
  });

  it('has default workflow', () => {
    expect(DEFAULT_CONFIG.workflows['default']).toBeDefined();
    expect(DEFAULT_CONFIG.workflows['default']!.phases).toContain('specify');
    expect(DEFAULT_CONFIG.workflows['default']!.phases).toContain('implement');
  });
});

describe('Custom Workflows', () => {
  it('loads custom workflow from config', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      workflows: {
        rapid: { phases: ['specify', 'implement'] },
      },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.config.workflows['rapid']).toBeDefined();
    expect(result.config.workflows['rapid']!.phases).toEqual(['specify', 'implement']);
    // Default workflow is still present
    expect(result.config.workflows['default']).toBeDefined();
  });

  it('loads workflow with reviewBefore and reviewAfter', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      workflows: {
        'review-heavy': {
          phases: ['specify', 'plan', 'implement'],
          reviewBefore: ['plan'],
          reviewAfter: ['implement'],
        },
      },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    const wf = result.config.workflows['review-heavy']!;
    expect(wf.phases).toEqual(['specify', 'plan', 'implement']);
    expect(wf.reviewBefore).toEqual(['plan']);
    expect(wf.reviewAfter).toEqual(['implement']);
  });

  it('warns on invalid workflow definition', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      workflows: {
        bad: 'not an object',
      },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings).toContain('Invalid workflow definition: "bad"');
  });

  it('warns on workflow missing phases array', () => {
    writeFileSync(join(TEST_DIR, CONFIG_FILENAME), JSON.stringify({
      workflows: {
        bad: { phases: 'not-array' },
      },
    }), 'utf-8');
    const result = loadConfig(TEST_DIR);
    expect(result.warnings).toContain('Invalid workflow definition: "bad"');
  });

  it('resolveConfig handles workflows', () => {
    const result = resolveConfig({
      workflows: {
        research: { phases: ['explore', 'clarify', 'specify'] },
      },
    });
    expect(result.config.workflows['research']).toBeDefined();
    expect(result.config.workflows['research']!.phases).toEqual(['explore', 'clarify', 'specify']);
  });
});
