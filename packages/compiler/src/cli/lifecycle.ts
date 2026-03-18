// ---------------------------------------------------------------------------
// Prodara Compiler — Process Lifecycle & Signal Handling
// ---------------------------------------------------------------------------
// Registers signal handlers for graceful shutdown. On SIGINT/SIGTERM,
// releases the build lock and cleans up temp files before exiting.

import { releaseLock, cleanupTempFiles } from '../build-state/build-state.js';

export type ShutdownCallback = () => void;

let activeRoot: string | null = null;
let extraCallbacks: ShutdownCallback[] = [];
let registered = false;

/**
 * Register signal handlers for graceful shutdown.
 * Call once at CLI startup. Safe to call multiple times (idempotent).
 */
export function registerShutdownHandlers(): void {
  if (registered) return;
  registered = true;

  /* v8 ignore start -- signal handlers call process.exit; tested via integration */
  const handler = (signal: string): void => {
    performCleanup();
    const code = signal === 'SIGINT' ? 130 : 143;
    process.exit(code);
  };

  process.on('SIGINT', () => handler('SIGINT'));
  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('uncaughtException', (err) => {
    process.stderr.write(`Prodara: uncaught exception — ${err.message}\n`);
    performCleanup();
    process.exit(1);
  });
  /* v8 ignore stop */
}

/**
 * Set the active build root so cleanup knows which directory to clean.
 */
export function setActiveRoot(root: string): void {
  activeRoot = root;
}

/**
 * Clear the active root after a successful build completes.
 */
export function clearActiveRoot(): void {
  activeRoot = null;
}

/**
 * Register an additional cleanup callback to run during shutdown.
 */
export function onShutdown(callback: ShutdownCallback): void {
  extraCallbacks.push(callback);
}

/**
 * Run all cleanup actions. Called by signal handlers.
 * Also exported for testing.
 */
export function performCleanup(): void {
  if (activeRoot) {
    /* v8 ignore next 2 -- releaseLock/cleanupTempFiles handle errors internally */
    try { releaseLock(activeRoot); } catch { /* best-effort */ }
    try { cleanupTempFiles(activeRoot); } catch { /* best-effort */ }
  }
  for (const cb of extraCallbacks) {
    try { cb(); } catch { /* best-effort */ }
  }
}

/**
 * Reset all state. Used in tests only.
 */
export function resetLifecycle(): void {
  activeRoot = null;
  extraCallbacks = [];
  registered = false;
}
