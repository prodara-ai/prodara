// ---------------------------------------------------------------------------
// Prodara Compiler — Build State
// ---------------------------------------------------------------------------
// Manages the .prodara/ directory: build.json, product-graph.json, plan.json
// All writes are atomic: write to temp files then rename.

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { ProductGraph } from '../graph/graph-types.js';
import type { Plan } from '../planner/plan-types.js';

const BUILD_DIR = '.prodara';
const BUILD_FILE = 'build.json';
const GRAPH_FILE = 'product-graph.json';
const PLAN_FILE = 'plan.json';
const SOURCES_FILE = 'sources.json';
const LOCK_FILE = '.lock';

const LOCK_STALE_MS = 5 * 60 * 1000; // 5 minutes

export interface BuildState {
  readonly version: string;
  readonly lastCompiled: string;
  readonly sourceHash: string;
  readonly graphHash: string;
  readonly checksum: string;
}

export interface LockInfo {
  readonly pid: number;
  readonly timestamp: string;
}

/**
 * Ensure the .prodara/ directory exists.
 * Creates a .gitignore to exclude transient files (runs/, temp files).
 */
export function ensureBuildDir(root: string): string {
  const dir = join(root, BUILD_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const gitignorePath = join(dir, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, 'runs/\n*.tmp\n', 'utf-8');
  }
  return dir;
}

/**
 * Read the previous product graph from build state, if it exists.
 */
export function readPreviousGraph(root: string): ProductGraph | null {
  const path = join(root, BUILD_DIR, GRAPH_FILE);
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ProductGraph;
}

/**
 * Atomically write a string to a file by writing to a temp file then renaming.
 */
function atomicWriteSync(filePath: string, content: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filePath);
}

/**
 * Clean up any leftover temp files from a failed write.
 */
export function cleanupTempFiles(root: string): void {
  const dir = join(root, BUILD_DIR);
  for (const name of [GRAPH_FILE, PLAN_FILE, BUILD_FILE, SOURCES_FILE]) {
    const tmpPath = join(dir, name + '.tmp');
    try { unlinkSync(tmpPath); } catch { /* no temp file */ }
  }
}

/**
 * Write build state files atomically.
 * Writes to temp files first, then renames all three.
 * If any rename fails, cleans up temp files.
 */
export function writeBuildState(
  root: string,
  graph: ProductGraph,
  plan: Plan,
  sourceFiles: readonly string[],
): void {
  const dir = ensureBuildDir(root);

  const graphJson = JSON.stringify(graph, null, 2);
  const planJson = JSON.stringify(plan, null, 2);
  const sourcesJson = JSON.stringify(sourceFiles, null, 2);

  const sourceHash = hashStrings(sourceFiles);
  const graphHash = hashString(graphJson);

  const buildState: BuildState = {
    version: '0.1.0',
    lastCompiled: new Date().toISOString(),
    sourceHash,
    graphHash,
    checksum: '', // placeholder — computed below
  };

  // Compute checksum over the other fields
  const stateForChecksum = { ...buildState, checksum: undefined };
  const buildJson = JSON.stringify(stateForChecksum, null, 2);
  const checksum = hashString(graphJson + planJson + buildJson);
  const finalBuildState: BuildState = { ...buildState, checksum };
  const finalBuildJson = JSON.stringify(finalBuildState, null, 2);

  // Write all to temp files first
  const graphTmp = join(dir, GRAPH_FILE + '.tmp');
  const planTmp = join(dir, PLAN_FILE + '.tmp');
  const buildTmp = join(dir, BUILD_FILE + '.tmp');
  const sourcesTmp = join(dir, SOURCES_FILE + '.tmp');

  try {
    writeFileSync(graphTmp, graphJson, 'utf-8');
    writeFileSync(planTmp, planJson, 'utf-8');
    writeFileSync(buildTmp, finalBuildJson, 'utf-8');
    writeFileSync(sourcesTmp, sourcesJson, 'utf-8');

    // Atomic renames
    renameSync(graphTmp, join(dir, GRAPH_FILE));
    renameSync(planTmp, join(dir, PLAN_FILE));
    renameSync(buildTmp, join(dir, BUILD_FILE));
    renameSync(sourcesTmp, join(dir, SOURCES_FILE));
  } catch (err) {
    // Clean up temp files on failure
    for (const tmp of [graphTmp, planTmp, buildTmp, sourcesTmp]) {
      try { unlinkSync(tmp); } catch { /* ignore */ }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Build Locking
// ---------------------------------------------------------------------------

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire a build lock. Throws if another process holds the lock.
 */
export function acquireLock(root: string): void {
  const dir = ensureBuildDir(root);
  const lockPath = join(dir, LOCK_FILE);

  if (existsSync(lockPath)) {
    try {
      const content = readFileSync(lockPath, 'utf-8');
      const lock = JSON.parse(content) as LockInfo;
      const age = Date.now() - new Date(lock.timestamp).getTime();

      // Release stale locks (dead process or >5 min)
      if (!isProcessAlive(lock.pid) || age > LOCK_STALE_MS) {
        unlinkSync(lockPath);
      } else {
        throw new Error(`Build locked by PID ${lock.pid} (started ${lock.timestamp})`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Build locked')) throw err;
      // Corrupt lock file — remove and proceed
      /* v8 ignore next */
      try { unlinkSync(lockPath); } catch { /* ignore */ }
    }
  }

  const lockInfo: LockInfo = {
    pid: process.pid,
    timestamp: new Date().toISOString(),
  };
  atomicWriteSync(lockPath, JSON.stringify(lockInfo, null, 2));
}

/**
 * Release the build lock.
 */
export function releaseLock(root: string): void {
  const lockPath = join(root, BUILD_DIR, LOCK_FILE);
  try { unlinkSync(lockPath); } catch { /* no lock file */ }
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

function hashString(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function hashStrings(strs: readonly string[]): string {
  const hash = createHash('sha256');
  for (const s of [...strs].sort()) {
    hash.update(s);
  }
  return hash.digest('hex');
}
