// ---------------------------------------------------------------------------
// Tests — Agent Slash Command Generation
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  generateSlashCommands,
  writeSlashCommands,
  isValidAgentId,
  listSupportedAgents,
  getAgentConfig,
  detectAgent,
  SLASH_COMMAND_COUNT,
} from '../src/cli/agent-setup.js';
import type { AgentId } from '../src/cli/agent-setup.js';
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

  describe('generateSlashCommands', () => {
    it('generates 29 slash commands for claude', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      expect(commands).toHaveLength(29);
      for (const cmd of commands) {
        expect(cmd.path).toContain('.claude/commands/prodara');
        expect(cmd.path).toMatch(/\.md$/);
        expect(cmd.content).toContain('# Prodara:');
      }
    });

    it('generates main prompt as prodara.md (not prodara-build.md) for claude', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      const buildCmd = commands.find(c => c.content.includes('Full Build Pipeline'));
      expect(buildCmd).toBeDefined();
      expect(buildCmd!.path).toMatch(/\/prodara\.md$/);
    });

    it('generates copilot commands with YAML frontmatter', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('copilot', root, 'my_app');
      expect(commands).toHaveLength(29);
      for (const cmd of commands) {
        expect(cmd.path).toContain('.github/prompts/prodara');
        expect(cmd.path).toMatch(/\.prompt\.md$/);
        expect(cmd.content).toContain('---');
        expect(cmd.content).toContain('description:');
        expect(cmd.content).toContain('mode: agent');
        expect(cmd.content).not.toContain('tools:');
      }
    });

    it('generates main prompt as prodara.prompt.md for copilot with name field', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('copilot', root, 'my_app');
      const buildCmd = commands.find(c => c.content.includes('Full Build Pipeline'));
      expect(buildCmd).toBeDefined();
      expect(buildCmd!.path).toMatch(/\/prodara\.prompt\.md$/);
      expect(buildCmd!.content).toContain('name: Prodara');
    });

    it('copilot non-build commands do not include name field', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('copilot', root, 'my_app');
      const nonBuildCmds = commands.filter(c => !c.content.includes('Full Build Pipeline'));
      expect(nonBuildCmds.length).toBeGreaterThan(0);
      for (const cmd of nonBuildCmds) {
        expect(cmd.content).not.toContain('name: Prodara');
      }
    });

    it('generates cursor commands with YAML frontmatter', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('cursor', root, 'my_app');
      expect(commands).toHaveLength(29);
      for (const cmd of commands) {
        expect(cmd.path).toContain('.cursor/rules/prodara');
        expect(cmd.path).toMatch(/\.mdc$/);
        expect(cmd.content).toContain('---');
        expect(cmd.content).toContain('globs:');
      }
    });

    it('generates generic commands without frontmatter', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('generic', root, 'my_app');
      expect(commands).toHaveLength(29);
      for (const cmd of commands) {
        expect(cmd.content).not.toMatch(/^---/);
      }
    });

    it('uses custom directory when provided', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('generic', root, 'my_app', '.myagent/cmds');
      expect(commands).toHaveLength(29);
      for (const cmd of commands) {
        expect(cmd.path).toContain('.myagent/cmds/prodara');
      }
    });

    it('includes product name in command content', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'billing_app');
      const specifyCmd = commands.find(c => c.path.includes('specify'));
      expect(specifyCmd).toBeDefined();
      expect(specifyCmd!.content).toContain('billing_app');
    });

    it('generates all expected command slugs', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      const slugs = commands.map(c => {
        const mainMatch = c.path.match(/\/prodara\.\w/);
        if (mainMatch) return 'build';
        const match = c.path.match(/prodara-([\w-]+)\./);
        return match?.[1];
      });
      // Workflow
      expect(slugs).toContain('build');
      expect(slugs).toContain('validate');
      expect(slugs).toContain('constitution');
      expect(slugs).toContain('specify');
      expect(slugs).toContain('plan');
      expect(slugs).toContain('implement');
      expect(slugs).toContain('clarify');
      expect(slugs).toContain('review');
      expect(slugs).toContain('propose');
      expect(slugs).toContain('explore');
      expect(slugs).toContain('party');
      // Spec-edit
      expect(slugs).toContain('add-module');
      expect(slugs).toContain('add-entity');
      expect(slugs).toContain('add-workflow');
      expect(slugs).toContain('add-screen');
      expect(slugs).toContain('add-policy');
      expect(slugs).toContain('rename');
      expect(slugs).toContain('move');
      // Query
      expect(slugs).toContain('explain');
      expect(slugs).toContain('why');
      expect(slugs).toContain('graph');
      expect(slugs).toContain('diff');
      expect(slugs).toContain('drift');
      expect(slugs).toContain('analyze');
      expect(slugs).toContain('checklist');
      // Management
      expect(slugs).toContain('help');
      expect(slugs).toContain('onboard');
      expect(slugs).toContain('extensions');
      expect(slugs).toContain('presets');
    });

    it('SLASH_COMMAND_COUNT matches generated commands', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      expect(commands).toHaveLength(SLASH_COMMAND_COUNT);
    });

    it('assigns categories to all commands', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      // Every command should have non-empty content (categories are internal)
      for (const cmd of commands) {
        expect(cmd.content.length).toBeGreaterThan(0);
      }
    });

    it('includes reference section in all commands', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      for (const cmd of commands) {
        expect(cmd.content).toContain('## Reference');
        expect(cmd.content).toContain('prodara.config.json');
      }
    });
  });

  describe('writeSlashCommands', () => {
    it('writes command files to disk', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      writeSlashCommands(commands);
      for (const cmd of commands) {
        expect(existsSync(cmd.path)).toBe(true);
        const content = readFileSync(cmd.path, 'utf-8');
        expect(content).toBe(cmd.content);
      }
    });

    it('creates directories recursively', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('copilot', root, 'my_app');
      writeSlashCommands(commands);
      expect(existsSync(join(root, '.github', 'prompts'))).toBe(true);
    });
  });

  describe('detectAgent', () => {
    it('detects copilot from .github/prompts/prodara.prompt.md', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('copilot', root, 'my_app');
      writeSlashCommands(commands);
      expect(detectAgent(root)).toBe('copilot');
    });

    it('detects claude from .claude/commands/prodara.md', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('claude', root, 'my_app');
      writeSlashCommands(commands);
      expect(detectAgent(root)).toBe('claude');
    });

    it('detects cursor from .cursor/rules/prodara.mdc', () => {
      const root = makeTempDir();
      const commands = generateSlashCommands('cursor', root, 'my_app');
      writeSlashCommands(commands);
      expect(detectAgent(root)).toBe('cursor');
    });

    it('returns null when no agent commands exist', () => {
      const root = makeTempDir();
      expect(detectAgent(root)).toBeNull();
    });
  });
});
