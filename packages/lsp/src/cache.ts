// ---------------------------------------------------------------------------
// Prodara LSP — Module Cache
// ---------------------------------------------------------------------------
// LRU cache for parsed module results. Evicts least-recently-used entries
// when the cache exceeds its configured size.

import type { CacheEntry } from './types.js';

/** LRU cache for parsed module results, evicting least-recently-used entries. */
export class ModuleCache {
  private readonly maxSize: number;
  private readonly entries = new Map<string, CacheEntry>();

  constructor(maxSize: number) {
    if (maxSize < 1) throw new RangeError('maxSize must be at least 1');
    this.maxSize = maxSize;
  }

  get(uri: string): CacheEntry | undefined {
    const entry = this.entries.get(uri);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
    return entry;
  }

  set(uri: string, version: number, text: string): CacheEntry {
    const entry: CacheEntry = { uri, version, text, lastAccessed: Date.now() };
    this.entries.set(uri, entry);
    this.evictIfNeeded();
    return entry;
  }

  delete(uri: string): boolean {
    return this.entries.delete(uri);
  }

  has(uri: string): boolean {
    return this.entries.has(uri);
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  /** Returns all cached URIs. */
  keys(): string[] {
    return [...this.entries.keys()];
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.maxSize) {
      // Map iteration order is insertion order — the first entry is the
      // oldest *inserted* key.  For a true LRU we scan for the minimum
      // lastAccessed, but we keep the scan efficient by breaking early
      // when we find the first entry (typically the oldest).
      let oldestUri: string | null = null;
      let oldestTime = Infinity;
      for (const [uri, entry] of this.entries) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestUri = uri;
        }
      }
      if (oldestUri) {
        this.entries.delete(oldestUri);
      }
    }
  }
}
