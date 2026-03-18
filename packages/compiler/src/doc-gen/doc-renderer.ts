// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Main Renderer
// ---------------------------------------------------------------------------
// Top-level entry point: generates DocFile[] from a ProductGraph.
// Also handles writing files with atomic writes and stale cleanup.

import { writeFileSync, mkdirSync, readdirSync, unlinkSync, renameSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ProductGraph } from '../graph/graph-types.js';
import type { ResolvedDocsConfig } from '../config/config.js';
import { createStringResolver } from './string-resolver.js';
import { createLinkResolver } from './link-resolver.js';
import { renderModuleDoc } from './module-renderer.js';
import { renderProductOverview } from './product-renderer.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DocFile {
  readonly path: string;
  readonly content: string;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate human-readable markdown docs from a product graph.
 * Returns the files to write — caller can use `writeDocs()` for I/O.
 */
export function generateDocs(
  graph: ProductGraph,
  config: ResolvedDocsConfig,
  root: string,
): DocFile[] {
  const outputDir = resolve(root, config.outputDir);
  const resolveString = createStringResolver(graph);
  const resolveLink = createLinkResolver(graph);
  const files: DocFile[] = [];

  // Product overview
  files.push({
    path: join(outputDir, 'README.md'),
    content: renderProductOverview(graph, resolveString),
  });

  // Per-module docs
  for (const mod of graph.modules) {
    files.push({
      path: join(outputDir, `${mod.name}.md`),
      content: renderModuleDoc(mod, graph, resolveString, resolveLink),
    });
  }

  return files;
}

// ---------------------------------------------------------------------------
// File writing
// ---------------------------------------------------------------------------

/**
 * Write generated doc files to disk with atomic writes.
 * Cleans up stale .md files that no longer correspond to modules.
 */
export function writeDocs(files: DocFile[], outputDir: string, root: string): void {
  const absOutputDir = resolve(root, outputDir);
  mkdirSync(absOutputDir, { recursive: true });

  // Write files atomically (temp + rename)
  const writtenNames = new Set<string>();
  for (const file of files) {
    const tmpPath = file.path + `.tmp_${randomBytes(4).toString('hex')}`;
    writeFileSync(tmpPath, file.content, 'utf-8');
    renameSync(tmpPath, file.path);
    writtenNames.add(basename(file.path));
  }

  // Clean stale .md files that no longer correspond to modules
  const existing = readdirSync(absOutputDir);
  for (const name of existing) {
    if (name.endsWith('.md') && !writtenNames.has(name)) {
      unlinkSync(join(absOutputDir, name));
    }
  }
}
