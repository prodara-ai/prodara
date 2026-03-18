// ---------------------------------------------------------------------------
// Prodara Compiler — File Discovery
// ---------------------------------------------------------------------------
// Discovers .prd files in a workspace directory.

import { readdirSync, lstatSync, realpathSync } from 'node:fs';
import { join, extname } from 'node:path';

const DEFAULT_MAX_DEPTH = 100;

/**
 * Recursively discover all `.prd` files under the given root directory.
 * Returns absolute file paths, sorted alphabetically for deterministic ordering.
 */
export function discoverFiles(root: string, maxDepth: number = DEFAULT_MAX_DEPTH): string[] {
  const files: string[] = [];
  const visited = new Set<string>();
  walk(root, files, visited, 0, maxDepth);
  return files.sort();
}

function walk(dir: string, acc: string[], visited: Set<string>, depth: number, maxDepth: number): void {
  if (depth > maxDepth) return;

  // Resolve real path for cycle detection
  let realDir: string;
  try {
    realDir = realpathSync(dir);
  } catch {
    return;
  }
  /* v8 ignore next */
  if (visited.has(realDir)) return;
  visited.add(realDir);

  let entries: string[];
  try {
    entries = readdirSync(dir);
  /* v8 ignore start -- readdirSync error requires unreadable directory */
  } catch {
    return;
  }
  /* v8 ignore stop */

  for (const entry of entries.sort()) {
    // Skip hidden directories and build output
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;
    const fullPath = join(dir, entry);
    try {
      const stat = lstatSync(fullPath);
      // Skip symlinks to avoid cycles
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        walk(fullPath, acc, visited, depth + 1, maxDepth);
      } else if (stat.isFile() && extname(entry) === '.prd') {
        acc.push(fullPath);
      }
    /* v8 ignore start -- lstatSync error requires racy filesystem */
    } catch {
      // skip unreadable entries
    }
    /* v8 ignore stop */
  }
}
