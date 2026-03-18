// ---------------------------------------------------------------------------
// Tests — Preset System
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'vitest';
import { loadPresets, installPreset, removePreset, mergePresetOverrides } from '../src/presets/loader.js';
import type { PresetManifest, InstalledPreset } from '../src/presets/types.js';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'prodara-preset-'));
  mkdirSync(join(dir, '.prodara'), { recursive: true });
  return dir;
}

function makePresetManifest(overrides: Partial<PresetManifest> = {}): PresetManifest {
  return {
    name: 'test-preset',
    version: '1.0.0',
    description: 'Test preset',
    overrides: {},
    ...overrides,
  };
}

describe('Preset Loader', () => {
  let root: string;

  beforeEach(() => {
    root = makeTempDir();
  });

  it('installs preset', () => {
    const manifest = makePresetManifest();
    const installed = installPreset(root, 'test-preset', manifest);
    expect(installed.manifest.name).toBe('test-preset');
    expect(installed.priority).toBe(0);
  });

  it('throws on duplicate install', () => {
    installPreset(root, 'test-preset', makePresetManifest());
    expect(() => installPreset(root, 'test-preset', makePresetManifest())).toThrow('already installed');
  });

  it('removes preset', () => {
    installPreset(root, 'test-preset', makePresetManifest());
    removePreset(root, 'test-preset');
    expect(loadPresets(root)).toHaveLength(0);
  });

  it('throws removing non-existent preset', () => {
    expect(() => removePreset(root, 'nope')).toThrow('not installed');
  });

  it('loads presets with priority', () => {
    installPreset(root, 'alpha', makePresetManifest({ name: 'alpha' }));
    installPreset(root, 'beta', makePresetManifest({ name: 'beta' }));
    const presets = loadPresets(root);
    expect(presets).toHaveLength(2);
    // Priority is sequential
    const priorities = presets.map(p => p.priority);
    expect(priorities[0]).toBeLessThan(priorities[1]!);
  });

  it('returns empty for no presets dir', () => {
    expect(loadPresets(root)).toHaveLength(0);
  });

  it('skips preset with invalid JSON manifest', () => {
    const presetsDir = join(root, '.prodara', 'presets', 'broken');
    mkdirSync(presetsDir, { recursive: true });
    writeFileSync(join(presetsDir, 'prodara-preset.json'), '{not valid json');
    const presets = loadPresets(root);
    expect(presets).toHaveLength(0);
  });

  it('skips preset with non-string name or version', () => {
    const presetsDir = join(root, '.prodara', 'presets', 'bad-meta');
    mkdirSync(presetsDir, { recursive: true });
    writeFileSync(join(presetsDir, 'prodara-preset.json'), JSON.stringify({
      name: 123,
      version: '1.0.0',
      overrides: {},
    }));
    const presets = loadPresets(root);
    expect(presets).toHaveLength(0);
  });
});

describe('mergePresetOverrides', () => {
  it('returns empty for no presets', () => {
    const merged = mergePresetOverrides([]);
    expect(Object.keys(merged.templates)).toHaveLength(0);
    expect(Object.keys(merged.reviewerConfig)).toHaveLength(0);
    expect(Object.keys(merged.slashCommandOverrides)).toHaveLength(0);
  });

  it('merges template overrides from multiple presets', () => {
    const presets: InstalledPreset[] = [
      {
        manifest: makePresetManifest({
          name: 'a',
          overrides: { templates: { 'review.md': 'templates/review.md' } },
        }),
        path: '/a',
        priority: 0,
      },
      {
        manifest: makePresetManifest({
          name: 'b',
          overrides: { templates: { 'plan.md': 'templates/plan.md' } },
        }),
        path: '/b',
        priority: 1,
      },
    ];

    const merged = mergePresetOverrides(presets);
    expect(merged.templates['review.md']).toBe('templates/review.md');
    expect(merged.templates['plan.md']).toBe('templates/plan.md');
  });

  it('later presets override earlier ones', () => {
    const presets: InstalledPreset[] = [
      {
        manifest: makePresetManifest({
          name: 'base',
          overrides: { templates: { 'review.md': 'v1' } },
        }),
        path: '/a',
        priority: 0,
      },
      {
        manifest: makePresetManifest({
          name: 'org',
          overrides: { templates: { 'review.md': 'v2' } },
        }),
        path: '/b',
        priority: 1,
      },
    ];

    const merged = mergePresetOverrides(presets);
    expect(merged.templates['review.md']).toBe('v2');
  });

  it('merges reviewer config', () => {
    const presets: InstalledPreset[] = [
      {
        manifest: makePresetManifest({
          name: 'strict',
          overrides: { reviewerConfig: { security: { enabled: true } } },
        }),
        path: '/a',
        priority: 0,
      },
    ];

    const merged = mergePresetOverrides(presets);
    expect(merged.reviewerConfig['security']).toEqual({ enabled: true });
  });
});
