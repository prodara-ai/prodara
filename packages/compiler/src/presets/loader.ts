// ---------------------------------------------------------------------------
// Prodara Compiler — Preset Loader
// ---------------------------------------------------------------------------
// Discovers and manages presets from `.prodara/presets/`.

import { existsSync, readdirSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PresetManifest, InstalledPreset } from './types.js';

/** Conventional directory for locally-installed presets. */
export const PRESETS_DIR = '.prodara/presets';

/** Conventional manifest filename. */
const MANIFEST_FILE = 'prodara-preset.json';

/**
 * Load all presets, sorted by priority (directory listing order = priority).
 */
export function loadPresets(root: string): InstalledPreset[] {
  const presetsDir = join(root, PRESETS_DIR);
  if (!existsSync(presetsDir)) return [];

  const results: InstalledPreset[] = [];
  const entries = readdirSync(presetsDir, { withFileTypes: true });
  let priority = 0;
  for (const entry of entries) {
    /* v8 ignore next -- skip non-directory entries */
    if (!entry.isDirectory()) continue;
    const manifestPath = join(presetsDir, entry.name, MANIFEST_FILE);
    /* v8 ignore next -- skip dirs without manifest */
    if (!existsSync(manifestPath)) continue;

    const manifest = parsePresetManifest(readFileSync(manifestPath, 'utf-8'), entry.name);
    if (manifest) {
      results.push({ manifest, path: join(presetsDir, entry.name), priority: priority++ });
    }
  }

  return results;
}

/**
 * Install a preset by writing its manifest.
 */
export function installPreset(root: string, name: string, manifest: PresetManifest): InstalledPreset {
  const presetDir = join(root, PRESETS_DIR, name);
  if (existsSync(presetDir)) {
    throw new Error(`Preset "${name}" is already installed`);
  }
  mkdirSync(presetDir, { recursive: true });
  writeFileSync(join(presetDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
  return { manifest, path: presetDir, priority: 0 };
}

/**
 * Remove an installed preset.
 */
export function removePreset(root: string, name: string): void {
  const presetDir = join(root, PRESETS_DIR, name);
  if (!existsSync(presetDir)) {
    throw new Error(`Preset "${name}" is not installed`);
  }
  rmSync(presetDir, { recursive: true, force: true });
}

/**
 * Merge preset overrides in priority order. Later presets win.
 * Returns a merged overrides object (union of all preset overrides).
 */
export function mergePresetOverrides(presets: readonly InstalledPreset[]): {
  templates: Record<string, string>;
  reviewerConfig: Record<string, { enabled?: boolean; promptPath?: string | null }>;
  slashCommandOverrides: Record<string, string>;
} {
  const merged = {
    templates: {} as Record<string, string>,
    reviewerConfig: {} as Record<string, { enabled?: boolean; promptPath?: string | null }>,
    slashCommandOverrides: {} as Record<string, string>,
  };

  const sorted = [...presets].sort((a, b) => a.priority - b.priority);
  for (const preset of sorted) {
    const { overrides } = preset.manifest;
    if (overrides.templates) Object.assign(merged.templates, overrides.templates);
    if (overrides.reviewerConfig) Object.assign(merged.reviewerConfig, overrides.reviewerConfig);
    /* v8 ignore next -- slashCommandOverrides is always present in test data */
    if (overrides.slashCommandOverrides) Object.assign(merged.slashCommandOverrides, overrides.slashCommandOverrides);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parsePresetManifest(raw: string, dirName: string): PresetManifest | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data['name'] !== 'string' || typeof data['version'] !== 'string') return null;
    /* v8 ignore next -- overrides is always present in valid presets */
    if (!data['overrides'] || typeof data['overrides'] !== 'object') return null;
    return data as unknown as PresetManifest;
  } catch {
    console.warn(`Warning: Could not parse preset manifest for "${dirName}"`);
    return null;
  }
}
