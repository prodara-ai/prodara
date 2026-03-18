// ---------------------------------------------------------------------------
// Tests — Extension System
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionRegistry } from '../src/extensions/registry.js';
import { installExtension, removeExtension, listInstalledExtensions, loadExtensions } from '../src/extensions/loader.js';
import { searchMarketplace, npmInstall, npmRemove } from '../src/extensions/marketplace.js';
import { execSync } from 'node:child_process';
import type { ExtensionManifest } from '../src/extensions/types.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));
import { mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'prodara-ext-'));
  mkdirSync(join(dir, '.prodara'), { recursive: true });
  return dir;
}

function makeManifest(overrides: Partial<ExtensionManifest> = {}): ExtensionManifest {
  return {
    name: 'prodara-ext-test',
    version: '1.0.0',
    description: 'Test extension',
    author: 'Test',
    prodara: { minVersion: '0.1.0' },
    capabilities: [{ kind: 'generator', supportedNodeKinds: ['entity'], entryPoint: 'dist/gen.js' }],
    ...overrides,
  };
}

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  beforeEach(() => {
    registry = new ExtensionRegistry();
  });

  it('registers and retrieves extensions', () => {
    const manifest = makeManifest();
    registry.register(manifest, '/fake/path');
    expect(registry.size).toBe(1);
    expect(registry.get('prodara-ext-test')).toBeDefined();
    expect(registry.get('prodara-ext-test')!.manifest.name).toBe('prodara-ext-test');
  });

  it('throws on duplicate registration', () => {
    const manifest = makeManifest();
    registry.register(manifest, '/a');
    expect(() => registry.register(manifest, '/b')).toThrow('already registered');
  });

  it('unregisters extensions', () => {
    registry.register(makeManifest(), '/a');
    expect(registry.unregister('prodara-ext-test')).toBe(true);
    expect(registry.size).toBe(0);
    expect(registry.unregister('non-existent')).toBe(false);
  });

  it('lists all extensions', () => {
    registry.register(makeManifest({ name: 'a' }), '/a');
    registry.register(makeManifest({ name: 'b' }), '/b');
    expect(registry.all()).toHaveLength(2);
  });

  it('filters by capability kind', () => {
    registry.register(makeManifest({ name: 'gen', capabilities: [{ kind: 'generator', supportedNodeKinds: ['entity'], entryPoint: 'a.js' }] }), '/a');
    registry.register(makeManifest({ name: 'rev', capabilities: [{ kind: 'reviewer', entryPoint: 'b.js' }] }), '/b');
    expect(registry.withCapability('generator')).toHaveLength(1);
    expect(registry.withCapability('reviewer')).toHaveLength(1);
    expect(registry.withCapability('template')).toHaveLength(0);
  });

  it('returns generators from enabled extensions', () => {
    registry.register(makeManifest({ name: 'gen', capabilities: [{ kind: 'generator', supportedNodeKinds: ['entity'], entryPoint: 'a.js' }] }), '/a');
    expect(registry.generators()).toHaveLength(1);
    expect(registry.generators()[0]!.cap.kind).toBe('generator');
  });

  it('returns commands from enabled extensions', () => {
    registry.register(makeManifest({ name: 'cmd', capabilities: [{ kind: 'command', name: 'hello', description: 'Hello cmd', entryPoint: 'c.js' }] }), '/c');
    expect(registry.commands()).toHaveLength(1);
    expect(registry.commands()[0]!.cap.name).toBe('hello');
  });

  it('clears all extensions', () => {
    registry.register(makeManifest(), '/a');
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it('returns reviewers from enabled extensions', () => {
    registry.register(makeManifest({ name: 'rev', capabilities: [{ kind: 'reviewer', entryPoint: 'r.js' }] }), '/r');
    expect(registry.reviewers()).toHaveLength(1);
    expect(registry.reviewers()[0]!.cap.kind).toBe('reviewer');
  });

  it('excludes disabled extensions from generators/reviewers/commands', () => {
    registry.register(makeManifest({
      name: 'disabled-ext',
      capabilities: [
        { kind: 'generator', supportedNodeKinds: ['entity'], entryPoint: 'g.js' },
        { kind: 'reviewer', entryPoint: 'r.js' },
        { kind: 'command', name: 'cmd', description: 'test', entryPoint: 'c.js' },
      ],
    }), '/d', false);
    expect(registry.generators()).toHaveLength(0);
    expect(registry.reviewers()).toHaveLength(0);
    expect(registry.commands()).toHaveLength(0);
  });
});

describe('Extension Loader', () => {
  let root: string;

  beforeEach(() => {
    root = makeTempDir();
  });

  it('installs extension', () => {
    const manifest = makeManifest();
    const installed = installExtension(root, 'prodara-ext-test', manifest);
    expect(installed.enabled).toBe(true);
    expect(existsSync(installed.path)).toBe(true);
  });

  it('throws on duplicate install', () => {
    installExtension(root, 'prodara-ext-test', makeManifest());
    expect(() => installExtension(root, 'prodara-ext-test', makeManifest())).toThrow('already installed');
  });

  it('removes extension', () => {
    installExtension(root, 'prodara-ext-test', makeManifest());
    removeExtension(root, 'prodara-ext-test');
    expect(listInstalledExtensions(root)).toHaveLength(0);
  });

  it('throws removing non-existent extension', () => {
    expect(() => removeExtension(root, 'nope')).toThrow('not installed');
  });

  it('lists installed extensions', () => {
    installExtension(root, 'ext-a', makeManifest({ name: 'ext-a' }));
    installExtension(root, 'ext-b', makeManifest({ name: 'ext-b' }));
    const list = listInstalledExtensions(root);
    expect(list).toHaveLength(2);
  });

  it('returns empty list for no extensions dir', () => {
    expect(listInstalledExtensions(root)).toHaveLength(0);
  });

  it('loadExtensions populates registry', () => {
    installExtension(root, 'ext-a', makeManifest({ name: 'ext-a' }));
    const registry = loadExtensions(root);
    expect(registry.size).toBe(1);
    expect(registry.get('ext-a')).toBeDefined();
  });

  it('skips extensions with invalid JSON manifest', () => {
    const { writeFileSync } = require('node:fs') as typeof import('node:fs');
    const extDir = join(root, '.prodara/extensions/bad-ext');
    mkdirSync(extDir, { recursive: true });
    writeFileSync(join(extDir, 'prodara-extension.json'), '<<<not json>>>');

    const registry = loadExtensions(root);
    expect(registry.size).toBe(0);
  });

  it('skips extensions with manifest missing required fields', () => {
    const { writeFileSync } = require('node:fs') as typeof import('node:fs');
    const extDir = join(root, '.prodara/extensions/incomplete');
    mkdirSync(extDir, { recursive: true });
    writeFileSync(join(extDir, 'prodara-extension.json'), JSON.stringify({ name: 'incomplete' }));

    const registry = loadExtensions(root);
    expect(registry.size).toBe(0);
  });
});

describe('Marketplace', () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
  });

  it('searchMarketplace returns empty on exec failure', () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('mock failure');
    });
    const results = searchMarketplace('test', 'extension');
    expect(results).toEqual([]);
  });

  it('searchMarketplace parses json results', () => {
    const mockResults = JSON.stringify([
      { name: 'prodara-extension-foo', version: '1.0.0', description: 'Foo ext' },
    ]);
    vi.mocked(execSync).mockReturnValue(mockResults);
    const results = searchMarketplace('foo', 'extension');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('prodara-extension-foo');
  });

  it('searchMarketplace uses preset keyword', () => {
    vi.mocked(execSync).mockReturnValue('[]');
    searchMarketplace('test', 'preset');
    expect(vi.mocked(execSync)).toHaveBeenCalledWith(
      expect.stringContaining('prodara-preset'),
      expect.anything(),
    );
  });

  it('npmInstall calls execSync with correct args', () => {
    vi.mocked(execSync).mockReturnValue('');
    npmInstall('prodara-extension-foo', '/tmp/project');
    expect(vi.mocked(execSync)).toHaveBeenCalledWith(
      expect.stringContaining('npm install prodara-extension-foo'),
      expect.objectContaining({ cwd: '/tmp/project' }),
    );
  });

  it('npmRemove calls execSync with correct args', () => {
    vi.mocked(execSync).mockReturnValue('');
    npmRemove('prodara-extension-foo', '/tmp/project');
    expect(vi.mocked(execSync)).toHaveBeenCalledWith(
      expect.stringContaining('npm remove prodara-extension-foo'),
      expect.objectContaining({ cwd: '/tmp/project' }),
    );
  });
});
