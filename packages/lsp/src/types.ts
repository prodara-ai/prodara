// ---------------------------------------------------------------------------
// Prodara LSP — Types
// ---------------------------------------------------------------------------

/** Parsed module cache entry. */
export interface CacheEntry {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
  lastAccessed: number;
}

/** LSP server configuration. */
export interface LspConfig {
  readonly maxCacheSize: number;
  readonly diagnosticDelay: number;
}

/** Default LSP configuration. */
export const DEFAULT_LSP_CONFIG: LspConfig = {
  maxCacheSize: 200,
  diagnosticDelay: 300,
};
