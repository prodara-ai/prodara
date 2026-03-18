// ---------------------------------------------------------------------------
// Prodara Compiler — Extension Loader
// ---------------------------------------------------------------------------
// Discovers and validates extensions from `.prodara/extensions/`.

import { existsSync, readdirSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExtensionManifest, InstalledExtension } from './types.js';
import { ExtensionRegistry } from './registry.js';

/** Conventional directory for locally-installed extensions. */
export const EXTENSIONS_DIR = '.prodara/extensions';

/** Conventional manifest filename. */
const MANIFEST_FILE = 'prodara-extension.json';

/**
 * Load all extensions from `.prodara/extensions/` and populate a registry.
 */
export function loadExtensions(root: string): ExtensionRegistry {
  const registry = new ExtensionRegistry();
  const extDir = join(root, EXTENSIONS_DIR);
  /* v8 ignore next -- early return when no extensions dir */
  if (!existsSync(extDir)) return registry;

  const entries = readdirSync(extDir, { withFileTypes: true });
  for (const entry of entries) {
    /* v8 ignore next -- skip non-directory entries */
    if (!entry.isDirectory()) continue;

    const manifestPath = join(extDir, entry.name, MANIFEST_FILE);
    /* v8 ignore next -- skip dirs without manifest */
    if (!existsSync(manifestPath)) continue;

    const manifest = parseManifest(readFileSync(manifestPath, 'utf-8'), entry.name);
    if (manifest) {
      registry.register(manifest, join(extDir, entry.name));
    }
  }

  return registry;
}

/**
 * Install an extension from a local directory by copying its manifest.
 */
export function installExtension(root: string, name: string, manifest: ExtensionManifest): InstalledExtension {
  const extDir = join(root, EXTENSIONS_DIR, name);
  if (existsSync(extDir)) {
    throw new Error(`Extension "${name}" is already installed`);
  }
  mkdirSync(extDir, { recursive: true });
  writeFileSync(join(extDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
  return { manifest, path: extDir, enabled: true };
}

/**
 * Remove an installed extension.
 */
export function removeExtension(root: string, name: string): void {
  const extDir = join(root, EXTENSIONS_DIR, name);
  if (!existsSync(extDir)) {
    throw new Error(`Extension "${name}" is not installed`);
  }
  rmSync(extDir, { recursive: true, force: true });
}

/**
 * List installed extensions (just metadata, no loading).
 */
export function listInstalledExtensions(root: string): InstalledExtension[] {
  const extDir = join(root, EXTENSIONS_DIR);
  if (!existsSync(extDir)) return [];

  const results: InstalledExtension[] = [];
  const entries = readdirSync(extDir, { withFileTypes: true });
  for (const entry of entries) {
    /* v8 ignore next -- skip non-directory entries */
    if (!entry.isDirectory()) continue;
    const manifestPath = join(extDir, entry.name, MANIFEST_FILE);
    /* v8 ignore next -- skip dirs without manifest */
    if (!existsSync(manifestPath)) continue;
    const manifest = parseManifest(readFileSync(manifestPath, 'utf-8'), entry.name);
    if (manifest) {
      results.push({ manifest, path: join(extDir, entry.name), enabled: true });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseManifest(raw: string, dirName: string): ExtensionManifest | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data['name'] !== 'string' || typeof data['version'] !== 'string') return null;
    /* v8 ignore next -- capabilities is always an array in valid manifests */
    if (!Array.isArray(data['capabilities'])) return null;
    return data as unknown as ExtensionManifest;
  } catch {
    console.warn(`Warning: Could not parse manifest for extension "${dirName}"`);
    return null;
  }
}
