// ---------------------------------------------------------------------------
// Prodara Compiler — Extension & Preset Marketplace
// ---------------------------------------------------------------------------
// Wraps npm search/install/remove for extensions and presets.
// Convention: extensions are `prodara-extension-{name}`, presets are
// `prodara-preset-{name}`.  All operations shell out to npm.

import * as cp from 'node:child_process';

/** Search result from npm registry. */
export interface MarketplaceEntry {
  readonly name: string;
  readonly version: string;
  readonly description: string;
}

/** Category of marketplace package. */
export type MarketplaceCategory = 'extension' | 'preset';

/** Build the npm keyword for a category. */
function keyword(category: MarketplaceCategory): string {
  return category === 'extension' ? 'prodara-extension' : 'prodara-preset';
}

/**
 * Search npm for packages matching `query` and `category`.
 * Returns parsed results from `npm search --json`.
 */
export function searchMarketplace(
  query: string,
  category: MarketplaceCategory,
): readonly MarketplaceEntry[] {
  const kw = keyword(category);
  const cmd = `npm search ${kw} ${query} --json --no-update-notifier`;
  try {
    const stdout = cp.execSync(cmd, { encoding: 'utf-8', timeout: 30_000 });
    const results = JSON.parse(stdout) as Array<{ name: string; version: string; description: string }>;
    return results.map(r => ({ name: r.name, version: r.version, description: r.description }));
  } catch {
    return [];
  }
}

/**
 * Install an npm package into the project.
 */
export function npmInstall(packageName: string, cwd: string): void {
  cp.execSync(`npm install ${packageName} --no-update-notifier`, { cwd, encoding: 'utf-8', timeout: 60_000 });
}

/**
 * Remove an npm package from the project.
 */
export function npmRemove(packageName: string, cwd: string): void {
  cp.execSync(`npm remove ${packageName} --no-update-notifier`, { cwd, encoding: 'utf-8', timeout: 60_000 });
}
