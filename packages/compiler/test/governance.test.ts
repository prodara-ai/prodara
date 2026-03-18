import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateGovernanceFiles, readGovernanceRules, loadConstitution } from '../src/governance/index.js';
import { DEFAULT_CONFIG } from '../src/config/config.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';
import type { ResolvedConfig } from '../src/config/config.js';

function makeGraph(modules: Partial<ModuleNode>[] = [], edges: ProductGraph['edges'] = []): ProductGraph {
  const mods: ModuleNode[] = modules.map((m, i) => ({
    id: m.id ?? `mod-${i}`,
    kind: 'module' as const,
    name: m.name ?? `module${i}`,
    imports: m.imports ?? [],
    ...m,
  }));

  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product',
      kind: 'product',
      name: 'TestProduct',
      title: 'Test Product',
      version: '1.0',
      modules: mods.map(m => m.id),
      publishes: null,
    },
    modules: mods,
    edges,
    metadata: {
      compiler: 'prodara-compiler@0.1.0',
      compiled_at: '2024-01-01T00:00:00.000Z',
      source_files: [],
    },
  };
}

describe('Governance', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prodara-gov-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateGovernanceFiles', () => {
    it('generates root agents.md', () => {
      const graph = makeGraph([{ id: 'core', name: 'core' }]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const root = files.find(f => f.path === join(tempDir, 'agents.md'));
      expect(root).toBeDefined();
      expect(root!.content).toContain('TestProduct');
      expect(root!.content).toContain('Governance Rules');
    });

    it('includes module list in root agents.md', () => {
      const graph = makeGraph([
        { id: 'auth', name: 'auth' },
        { id: 'billing', name: 'billing' },
      ]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const root = files.find(f => f.path === join(tempDir, 'agents.md'));
      expect(root!.content).toContain('`auth`');
      expect(root!.content).toContain('`billing`');
    });

    it('includes conventions from enabled reviewers', () => {
      const graph = makeGraph([]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const root = files.find(f => f.path === join(tempDir, 'agents.md'));
      expect(root!.content).toContain('architecture');
      expect(root!.content).toContain('**[constraint]**');
    });

    it('generates per-module agents.md', () => {
      const graph = makeGraph([{ id: 'auth', name: 'auth', imports: [] }]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const modFile = files.find(f => f.path.includes('auth'));
      expect(modFile).toBeDefined();
      expect(modFile!.content).toContain('auth — Module Rules');
    });

    it('appends Prodara workflow section to existing root agents.md', () => {
      writeFileSync(join(tempDir, 'agents.md'), '# Custom rules', 'utf-8');
      const graph = makeGraph([]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const root = files.find(f => f.path === join(tempDir, 'agents.md'));
      expect(root).toBeDefined();
      expect(root!.content).toContain('# Custom rules');
      expect(root!.content).toContain('## Prodara Spec-Driven Workflow');
    });

    it('does not overwrite existing module agents.md', () => {
      const modDir = join(tempDir, 'src', 'auth');
      mkdirSync(modDir, { recursive: true });
      writeFileSync(join(modDir, 'agents.md'), '# Custom', 'utf-8');
      const graph = makeGraph([{ id: 'auth', name: 'auth' }]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const modFile = files.find(f => f.path === join(modDir, 'agents.md'));
      expect(modFile).toBeUndefined();
    });

    it('includes validation commands in context', () => {
      const config: ResolvedConfig = {
        ...DEFAULT_CONFIG,
        validation: { ...DEFAULT_CONFIG.validation, test: 'npm test', lint: 'npm run lint' },
      };
      const graph = makeGraph([]);
      const files = generateGovernanceFiles(graph, config, tempDir);
      const root = files.find(f => f.path === join(tempDir, 'agents.md'));
      expect(root!.content).toContain('npm test');
      expect(root!.content).toContain('npm run lint');
    });

    it('includes module imports in module agents.md', () => {
      const graph = makeGraph([{
        id: 'billing',
        name: 'billing',
        imports: [{ symbol: 'User', from: 'auth', alias: null }],
      }]);
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const modFile = files.find(f => f.path.includes('billing'));
      expect(modFile!.content).toContain('imports `User` from `auth`');
    });

    it('includes relationship edges in module agents.md', () => {
      const graph = makeGraph(
        [{ id: 'billing', name: 'billing' }],
        [
          { from: 'billing.entity.invoice', to: 'billing.workflow.pay', kind: 'triggers' as 'contains' },
          { from: 'auth.entity.user', to: 'billing.entity.invoice', kind: 'references' as 'contains' },
        ],
      );
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      const modFile = files.find(f => f.path.includes('billing'));
      expect(modFile!.content).toContain('## Relationships');
      expect(modFile!.content).toContain('billing.entity.invoice');
      expect(modFile!.content).toContain('triggers');
      expect(modFile!.content).toContain('auth.entity.user');
      expect(modFile!.content).toContain('references');
    });

    it('appends Prodara workflow section to existing agents.md for graph with no modules', () => {
      const graph = makeGraph([]);
      writeFileSync(join(tempDir, 'agents.md'), '# Existing', 'utf-8');
      const files = generateGovernanceFiles(graph, DEFAULT_CONFIG, tempDir);
      expect(files).toHaveLength(1);
      expect(files[0]!.content).toContain('# Existing');
      expect(files[0]!.content).toContain('## Prodara Spec-Driven Workflow');
    });
  });

  describe('readGovernanceRules', () => {
    it('returns empty array when no agents.md exists', () => {
      const rules = readGovernanceRules(tempDir);
      expect(rules).toHaveLength(0);
    });

    it('parses governance rules from agents.md', () => {
      const content = [
        '# Rules',
        '',
        '- **[constraint]** Must use TypeScript strict mode',
        '- **[convention]** Use kebab-case for file names',
        '- **[preference]** Prefer functional patterns',
        '',
      ].join('\n');
      writeFileSync(join(tempDir, 'agents.md'), content, 'utf-8');
      const rules = readGovernanceRules(tempDir);
      expect(rules).toHaveLength(3);
      expect(rules[0]!.category).toBe('constraint');
      expect(rules[0]!.rule).toBe('Must use TypeScript strict mode');
      expect(rules[1]!.category).toBe('convention');
      expect(rules[2]!.category).toBe('preference');
    });

    it('ignores lines that do not match rule pattern', () => {
      const content = [
        '# Rules',
        '- Some plain bullet',
        '- **[invalid]** Not a valid category',
        '- **[constraint]** Valid rule',
      ].join('\n');
      writeFileSync(join(tempDir, 'agents.md'), content, 'utf-8');
      const rules = readGovernanceRules(tempDir);
      expect(rules).toHaveLength(1);
      expect(rules[0]!.rule).toBe('Valid rule');
    });
  });

  describe('loadConstitution', () => {
    it('returns null when no constitution configured and no default file', () => {
      expect(loadConstitution(DEFAULT_CONFIG, tempDir)).toBeNull();
    });

    it('loads constitution from explicit config path', () => {
      const configPath = join(tempDir, 'my-constitution.md');
      writeFileSync(configPath, '# Project Constitution\nAlways use TypeScript.', 'utf-8');
      const config: ResolvedConfig = {
        ...DEFAULT_CONFIG,
        constitution: { path: 'my-constitution.md' },
      };
      const content = loadConstitution(config, tempDir);
      expect(content).toContain('Project Constitution');
      expect(content).toContain('Always use TypeScript');
    });

    it('returns null when explicit path does not exist', () => {
      const config: ResolvedConfig = {
        ...DEFAULT_CONFIG,
        constitution: { path: 'missing.md' },
      };
      expect(loadConstitution(config, tempDir)).toBeNull();
    });

    it('loads constitution from default .prodara/constitution.md', () => {
      mkdirSync(join(tempDir, '.prodara'), { recursive: true });
      writeFileSync(join(tempDir, '.prodara', 'constitution.md'), 'Default constitution', 'utf-8');
      const content = loadConstitution(DEFAULT_CONFIG, tempDir);
      expect(content).toBe('Default constitution');
    });

    it('prefers explicit path over default location', () => {
      mkdirSync(join(tempDir, '.prodara'), { recursive: true });
      writeFileSync(join(tempDir, '.prodara', 'constitution.md'), 'Default', 'utf-8');
      writeFileSync(join(tempDir, 'custom.md'), 'Custom', 'utf-8');
      const config: ResolvedConfig = {
        ...DEFAULT_CONFIG,
        constitution: { path: 'custom.md' },
      };
      expect(loadConstitution(config, tempDir)).toBe('Custom');
    });
  });
});
