import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PromptFileDriver, createDriver } from '../src/agent/index.js';
import type { AgentRequest, AgentContext } from '../src/agent/index.js';

function makeContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    constitution: overrides.constitution ?? null,
    graphSlice: overrides.graphSlice ?? null,
    governance: overrides.governance ?? null,
    additionalContext: overrides.additionalContext ?? {},
  };
}

function makeRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
  return {
    prompt: overrides.prompt ?? 'Implement the billing module.',
    context: overrides.context ?? makeContext(),
    capability: overrides.capability ?? 'implement',
    platform: overrides.platform ?? 'copilot',
  };
}

describe('Agent', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-agent-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('PromptFileDriver', () => {
    it('writes prompt file for copilot', async () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const request = makeRequest({ platform: 'copilot' });
      const response = await driver.execute(request);

      expect(response.status).toBe('success');
      expect(response.metadata.platform).toBe('copilot');

      const expectedPath = join(tempDir, '.github/prompts/prodara-implement.prompt.md');
      expect(existsSync(expectedPath)).toBe(true);

      const content = readFileSync(expectedPath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('mode: implement');
      expect(content).toContain('Implement the billing module.');
    });

    it('writes prompt file for claude', async () => {
      const driver = new PromptFileDriver('claude', tempDir);
      const request = makeRequest({ platform: 'claude', capability: 'review' });
      const response = await driver.execute(request);

      expect(response.status).toBe('success');
      const expectedPath = join(tempDir, '.claude/commands/prodara-review.md');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('writes prompt file for cursor', async () => {
      const driver = new PromptFileDriver('cursor', tempDir);
      const request = makeRequest({ platform: 'cursor' });
      const response = await driver.execute(request);

      const expectedPath = join(tempDir, '.cursor/rules/prodara-implement.mdc');
      expect(existsSync(expectedPath)).toBe(true);

      const content = readFileSync(expectedPath, 'utf-8');
      expect(content).toContain('description: Prodara implement phase');
      expect(content).toContain('globs:');
    });

    it('writes prompt file for opencode', async () => {
      const driver = new PromptFileDriver('opencode', tempDir);
      const request = makeRequest({ platform: 'opencode' });
      const response = await driver.execute(request);

      const expectedPath = join(tempDir, '.opencode/agent/prodara-implement.md');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('writes prompt file for codex', async () => {
      const driver = new PromptFileDriver('codex', tempDir);
      const request = makeRequest({ platform: 'codex' });
      const response = await driver.execute(request);

      const expectedPath = join(tempDir, '.codex/prodara-implement.md');
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('includes constitution context', async () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const request = makeRequest({
        context: makeContext({ constitution: 'Use TypeScript strict mode.' }),
      });
      const response = await driver.execute(request);
      expect(response.content).toContain('## Constitution');
      expect(response.content).toContain('Use TypeScript strict mode.');
    });

    it('includes graph slice context', async () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const request = makeRequest({
        context: makeContext({ graphSlice: 'Node: billing.Invoice' }),
      });
      const response = await driver.execute(request);
      expect(response.content).toContain('## Graph Context');
      expect(response.content).toContain('Node: billing.Invoice');
    });

    it('includes governance context', async () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const request = makeRequest({
        context: makeContext({ governance: 'Must pass all reviews.' }),
      });
      const response = await driver.execute(request);
      expect(response.content).toContain('## Governance Rules');
    });

    it('includes additional context sections', async () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const request = makeRequest({
        context: makeContext({ additionalContext: { 'Task Details': 'Create invoice entity' } }),
      });
      const response = await driver.execute(request);
      expect(response.content).toContain('## Task Details');
      expect(response.content).toContain('Create invoice entity');
    });

    it('generatePromptFile returns path and content without writing', () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const request = makeRequest();
      const output = driver.generatePromptFile(request);

      expect(output.path).toContain('.github/prompts');
      expect(output.content).toContain('Implement the billing module.');
      // File should NOT be written yet
      expect(existsSync(output.path)).toBe(false);
    });

    it('reports duration in metadata', async () => {
      const driver = new PromptFileDriver('copilot', tempDir);
      const response = await driver.execute(makeRequest());
      expect(typeof response.metadata.duration_ms).toBe('number');
      expect(response.metadata.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createDriver', () => {
    it('creates PromptFileDriver for copilot', () => {
      const driver = createDriver('copilot', tempDir);
      expect(driver.platform).toBe('copilot');
    });

    it('creates PromptFileDriver for claude', () => {
      const driver = createDriver('claude', tempDir);
      expect(driver.platform).toBe('claude');
    });

    it('creates PromptFileDriver for cursor', () => {
      const driver = createDriver('cursor', tempDir);
      expect(driver.platform).toBe('cursor');
    });

    it('throws for api platform (not yet implemented)', () => {
      expect(() => createDriver('api', tempDir)).toThrow(/API driver not yet implemented/);
    });
  });
});
