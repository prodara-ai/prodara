// ---------------------------------------------------------------------------
// Tests — Agent Prompt Generation
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  generatePromptFile,
  writePromptFiles,
  generateSlashCommands,
  writeSlashCommands,
  isValidAgentId,
  listSupportedAgents,
  getAgentConfig,
  detectAgent,
  buildPromptContent,
} from '../src/cli/agent-setup.js';
import type { AgentId, PromptFile, SlashCommandFile } from '../src/cli/agent-setup.js';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'prodara-agent-'));
}

describe('Agent Setup', () => {
  describe('isValidAgentId', () => {
    it('accepts known agent IDs', () => {
      expect(isValidAgentId('claude')).toBe(true);
      expect(isValidAgentId('copilot')).toBe(true);
      expect(isValidAgentId('cursor')).toBe(true);
      expect(isValidAgentId('generic')).toBe(true);
    });

    it('rejects unknown agent IDs', () => {
      expect(isValidAgentId('unknown')).toBe(false);
      expect(isValidAgentId('')).toBe(false);
    });
  });

  describe('listSupportedAgents', () => {
    it('returns all supported agents', () => {
      const agents = listSupportedAgents();
      expect(agents).toContain('claude');
      expect(agents).toContain('copilot');
      expect(agents).toContain('cursor');
      expect(agents).toContain('generic');
      expect(agents).toContain('gemini');
      expect(agents).toContain('windsurf');
      expect(agents).toContain('codex');
      expect(agents).toContain('opencode');
      expect(agents).toContain('amp');
      expect(agents).toContain('roo');
      expect(agents).toContain('kiro');
      expect(agents).toContain('jules');
      expect(agents).toContain('aider');
      expect(agents).toContain('cline');
      expect(agents).toContain('continue');
      expect(agents).toContain('zed');
      expect(agents).toContain('bolt');
      expect(agents).toContain('aide');
      expect(agents).toContain('trae');
      expect(agents).toContain('augment');
      expect(agents).toContain('sourcegraph');
      expect(agents).toContain('tabnine');
      expect(agents).toContain('supermaven');
      expect(agents).toContain('void');
      expect(agents).toContain('pear');
      expect(agents).toContain('double');
      expect(agents.length).toBeGreaterThanOrEqual(26);
    });
  });

  describe('getAgentConfig', () => {
    it('returns config for known agent', () => {
      const config = getAgentConfig('copilot');
      expect(config).toBeDefined();
      expect(config!.commandsDir).toBe('.github/prompts');
      expect(config!.commandExtension).toBe('.prompt.md');
      expect(config!.frontmatterStyle).toBe('yaml');
      expect(config!.needsToolsField).toBe(true);
    });

    it('returns config for claude', () => {
      const config = getAgentConfig('claude');
      expect(config).toBeDefined();
      expect(config!.commandsDir).toBe('.claude/commands');
      expect(config!.commandExtension).toBe('.md');
      expect(config!.frontmatterStyle).toBe('none');
    });

    it('returns config for cursor', () => {
      const config = getAgentConfig('cursor');
      expect(config).toBeDefined();
      expect(config!.commandsDir).toBe('.cursor/rules');
      expect(config!.commandExtension).toBe('.mdc');
      expect(config!.frontmatterStyle).toBe('yaml');
    });
  });

  describe('generatePromptFile', () => {
    it('generates exactly 1 prompt file for claude', () => {
      const root = makeTempDir();
      const files = generatePromptFile('claude', root, 'my_app');
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toContain('.claude/commands/prodara');
      expect(files[0]!.path).toMatch(/\.md$/);
      expect(files[0]!.content).toContain('# Prodara');
    });

    it('generates copilot prompt with YAML frontmatter', () => {
      const root = makeTempDir();
      const files = generatePromptFile('copilot', root, 'my_app');
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toContain('.github/prompts/prodara');
      expect(files[0]!.path).toMatch(/\.prompt\.md$/);
      expect(files[0]!.content).toContain('---');
      expect(files[0]!.content).toContain('name: Prodara');
      expect(files[0]!.content).toContain('description:');
      expect(files[0]!.content).toContain('mode: agent');
    });

    it('generates cursor prompt with YAML frontmatter and globs', () => {
      const root = makeTempDir();
      const files = generatePromptFile('cursor', root, 'my_app');
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toContain('.cursor/rules/prodara');
      expect(files[0]!.path).toMatch(/\.mdc$/);
      expect(files[0]!.content).toContain('---');
      expect(files[0]!.content).toContain('globs:');
    });

    it('generates generic prompt without frontmatter', () => {
      const root = makeTempDir();
      const files = generatePromptFile('generic', root, 'my_app');
      expect(files).toHaveLength(1);
      expect(files[0]!.content).not.toMatch(/^---/);
    });

    it('uses custom directory when provided', () => {
      const root = makeTempDir();
      const files = generatePromptFile('generic', root, 'my_app', '.myagent/cmds');
      expect(files).toHaveLength(1);
      expect(files[0]!.path).toContain('.myagent/cmds/prodara');
    });

    it('includes product name in prompt content', () => {
      const root = makeTempDir();
      const files = generatePromptFile('claude', root, 'billing_app');
      expect(files[0]!.content).toContain('billing_app');
    });

    it('generates prompt for all 26 agent types', () => {
      const root = makeTempDir();
      const agents = listSupportedAgents();
      for (const agent of agents) {
        const files = generatePromptFile(agent, root, 'my_app');
        expect(files).toHaveLength(1);
        expect(files[0]!.path).toBeTruthy();
        expect(files[0]!.content.length).toBeGreaterThan(0);
      }
    });

    it('generates files in correct agent directories', () => {
      const root = makeTempDir();
      const expectations: Partial<Record<AgentId, string>> = {
        copilot: '.github/prompts',
        claude: '.claude/commands',
        cursor: '.cursor/rules',
        gemini: '.gemini/prompts',
        windsurf: '.windsurf/commands',
        codex: '.codex',
        opencode: '.opencode/agent',
        amp: '.amp/commands',
        roo: '.roo/commands',
        kiro: '.kiro/commands',
        jules: '.jules/prompts',
        aider: '.aider/prompts',
        cline: '.cline/rules',
        continue: '.continue/rules',
        zed: '.zed/prompts',
        bolt: '.bolt/prompts',
        aide: '.aide/prompts',
        trae: '.trae/rules',
        augment: '.augment/prompts',
        sourcegraph: '.sourcegraph/prompts',
        tabnine: '.tabnine/prompts',
        supermaven: '.supermaven/prompts',
        void: '.void/prompts',
        pear: '.pear/prompts',
        double: '.double/prompts',
        generic: '.ai/commands',
      };
      for (const [agent, dir] of Object.entries(expectations)) {
        const files = generatePromptFile(agent as AgentId, root, 'my_app');
        expect(files[0]!.path).toContain(dir);
      }
    });
  });

  describe('buildPromptContent', () => {
    it('includes all 8 phases', () => {
      const content = buildPromptContent('test_app');
      expect(content).toContain('Phase 1');
      expect(content).toContain('Phase 2');
      expect(content).toContain('Phase 3');
      expect(content).toContain('Phase 4');
      expect(content).toContain('Phase 5');
      expect(content).toContain('Phase 6');
      expect(content).toContain('Phase 7');
      expect(content).toContain('Phase 8');
    });

    it('includes product name', () => {
      const content = buildPromptContent('billing_app');
      expect(content).toContain('billing_app');
    });

    it('includes the core contract', () => {
      const content = buildPromptContent('my_app');
      expect(content).toContain('Core Contract');
    });

    it('includes repository governance', () => {
      const content = buildPromptContent('my_app');
      expect(content).toContain('Repository Governance');
      expect(content).toContain('agents.md');
    });

    it('includes failure escalation protocol', () => {
      const content = buildPromptContent('my_app');
      expect(content).toContain('BLOCKED');
      expect(content).toContain('Failure Escalation');
    });

    it('includes .prd language reference', () => {
      const content = buildPromptContent('my_app');
      expect(content).toContain('.prd Language');
      expect(content).toContain('entity');
      expect(content).toContain('workflow');
      expect(content).toContain('surface');
    });

    it('includes CLI reference', () => {
      const content = buildPromptContent('my_app');
      expect(content).toContain('prodara build');
      expect(content).toContain('prodara validate');
      expect(content).toContain('prodara test');
    });

    it('includes configuration reference', () => {
      const content = buildPromptContent('my_app');
      expect(content).toContain('prodara.config.json');
    });
  });

  describe('writePromptFiles', () => {
    it('writes prompt files to disk', () => {
      const root = makeTempDir();
      const files = generatePromptFile('claude', root, 'my_app');
      writePromptFiles(files);
      for (const file of files) {
        expect(existsSync(file.path)).toBe(true);
        const content = readFileSync(file.path, 'utf-8');
        expect(content).toBe(file.content);
      }
    });

    it('creates directories recursively', () => {
      const root = makeTempDir();
      const files = generatePromptFile('copilot', root, 'my_app');
      writePromptFiles(files);
      expect(existsSync(join(root, '.github', 'prompts'))).toBe(true);
    });
  });

  describe('legacy aliases', () => {
    it('generateSlashCommands is an alias for generatePromptFile', () => {
      expect(generateSlashCommands).toBe(generatePromptFile);
    });

    it('writeSlashCommands is an alias for writePromptFiles', () => {
      expect(writeSlashCommands).toBe(writePromptFiles);
    });

    it('SlashCommandFile type is compatible with PromptFile', () => {
      const file: SlashCommandFile = { path: '/test', content: 'test' };
      const prompt: PromptFile = file;
      expect(prompt.path).toBe('/test');
    });
  });

  describe('detectAgent', () => {
    it('detects copilot from .github/prompts/prodara.prompt.md', () => {
      const root = makeTempDir();
      const files = generatePromptFile('copilot', root, 'my_app');
      writePromptFiles(files);
      expect(detectAgent(root)).toBe('copilot');
    });

    it('detects claude from .claude/commands/prodara.md', () => {
      const root = makeTempDir();
      const files = generatePromptFile('claude', root, 'my_app');
      writePromptFiles(files);
      expect(detectAgent(root)).toBe('claude');
    });

    it('detects cursor from .cursor/rules/prodara.mdc', () => {
      const root = makeTempDir();
      const files = generatePromptFile('cursor', root, 'my_app');
      writePromptFiles(files);
      expect(detectAgent(root)).toBe('cursor');
    });

    it('returns null when no agent commands exist', () => {
      const root = makeTempDir();
      expect(detectAgent(root)).toBeNull();
    });
  });
});
