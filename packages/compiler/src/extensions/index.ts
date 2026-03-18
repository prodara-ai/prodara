// ---------------------------------------------------------------------------
// Prodara Compiler — Extensions barrel
// ---------------------------------------------------------------------------

export type { ExtensionManifest, ExtensionCapability, InstalledExtension } from './types.js';
export { ExtensionRegistry } from './registry.js';
export { loadExtensions, installExtension, removeExtension, listInstalledExtensions, EXTENSIONS_DIR } from './loader.js';
export type { MarketplaceEntry, MarketplaceCategory } from './marketplace.js';
export { searchMarketplace, npmInstall, npmRemove } from './marketplace.js';
