// ---------------------------------------------------------------------------
// Prodara Compiler — Extension Registry
// ---------------------------------------------------------------------------

import type { InstalledExtension, ExtensionManifest, ExtensionCapability } from './types.js';

/**
 * In-memory registry of loaded extensions. The registry does NOT perform
 * dynamic `import()` — it stays purely data-driven.  The pipeline and CLI
 * query it to discover what capabilities are available.
 */
export class ExtensionRegistry {
  private readonly _extensions = new Map<string, InstalledExtension>();

  /** Register an extension. */
  register(manifest: ExtensionManifest, path: string, enabled = true): void {
    if (this._extensions.has(manifest.name)) {
      throw new Error(`Extension "${manifest.name}" is already registered`);
    }
    this._extensions.set(manifest.name, { manifest, path, enabled });
  }

  /** Unregister an extension by name. */
  unregister(name: string): boolean {
    return this._extensions.delete(name);
  }

  /** Get all registered extensions. */
  all(): readonly InstalledExtension[] {
    return [...this._extensions.values()];
  }

  /** Get a single extension by name. */
  get(name: string): InstalledExtension | undefined {
    return this._extensions.get(name);
  }

  /** Get extensions that provide a given capability kind. */
  withCapability(kind: ExtensionCapability['kind']): readonly InstalledExtension[] {
    return this.all().filter(
      ext => ext.enabled && ext.manifest.capabilities.some(c => c.kind === kind),
    );
  }

  /** Get all generator capabilities from enabled extensions. */
  generators(): readonly { ext: InstalledExtension; cap: Extract<ExtensionCapability, { kind: 'generator' }> }[] {
    const result: { ext: InstalledExtension; cap: Extract<ExtensionCapability, { kind: 'generator' }> }[] = [];
    for (const ext of this.all()) {
      if (!ext.enabled) continue;
      for (const cap of ext.manifest.capabilities) {
        if (cap.kind === 'generator') result.push({ ext, cap });
      }
    }
    return result;
  }

  /** Get all reviewer capabilities from enabled extensions. */
  reviewers(): readonly { ext: InstalledExtension; cap: Extract<ExtensionCapability, { kind: 'reviewer' }> }[] {
    const result: { ext: InstalledExtension; cap: Extract<ExtensionCapability, { kind: 'reviewer' }> }[] = [];
    for (const ext of this.all()) {
      if (!ext.enabled) continue;
      for (const cap of ext.manifest.capabilities) {
        if (cap.kind === 'reviewer') result.push({ ext, cap });
      }
    }
    return result;
  }

  /** Get all custom command capabilities from enabled extensions. */
  commands(): readonly { ext: InstalledExtension; cap: Extract<ExtensionCapability, { kind: 'command' }> }[] {
    const result: { ext: InstalledExtension; cap: Extract<ExtensionCapability, { kind: 'command' }> }[] = [];
    for (const ext of this.all()) {
      if (!ext.enabled) continue;
      for (const cap of ext.manifest.capabilities) {
        if (cap.kind === 'command') result.push({ ext, cap });
      }
    }
    return result;
  }

  /** Number of registered extensions. */
  get size(): number {
    return this._extensions.size;
  }

  /** Clear all extensions. */
  clear(): void {
    this._extensions.clear();
  }
}
