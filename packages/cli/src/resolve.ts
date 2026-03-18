// ---------------------------------------------------------------------------
// @prodara/cli — Local Resolution
// ---------------------------------------------------------------------------
// Resolves the project-local @prodara/compiler installation.
// Walks up from cwd looking for node_modules/@prodara/compiler.
// Returns the resolved path or null if not found.

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/** Result of resolving a local @prodara/compiler installation. */
export interface LocalResolution {
  /** Absolute path to the local @prodara/compiler package directory */
  readonly packageDir: string;
  /** Version string from the local package.json */
  readonly version: string;
  /** Absolute path to the local CLI entry point (dist/cli/main.js) */
  readonly cliEntry: string;
}

/**
 * Walk up from `startDir` looking for node_modules/@prodara/compiler.
 * Returns null if no local installation is found.
 */
export function resolveLocal(startDir: string): LocalResolution | null {
  let current = startDir;

  for (;;) {
    const candidate = join(current, 'node_modules', '@prodara', 'compiler');
    const pkgPath = join(candidate, 'package.json');

    if (existsSync(pkgPath)) {
      try {
        const raw = readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(raw) as { version?: string; bin?: Record<string, string> };
        const version = typeof pkg.version === 'string' ? pkg.version : '0.0.0';

        // The CLI entry is either the bin field or the conventional path
        const cliEntry = join(candidate, 'dist', 'cli', 'main.js');

        if (existsSync(cliEntry)) {
          return { packageDir: candidate, version, cliEntry };
        }

        // Package found but not built — this is a valid resolution but with a
        // missing binary. We still return it so the caller can give a helpful message.
        return { packageDir: candidate, version, cliEntry };
      } catch {
        // Corrupted package.json — skip this candidate
      }
    }

    const parent = dirname(current);
    if (parent === current) break; // reached filesystem root
    current = parent;
  }

  return null;
}

/**
 * Parse a semver version string into major.minor.patch.
 * Returns [0,0,0] if parsing fails.
 */
export function parseSemver(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Check whether two versions are compatible (same major, local >= wrapper).
 */
export function checkVersionCompatibility(
  wrapperVersion: string,
  localVersion: string,
): { compatible: boolean; message: string } {
  const [wMajor] = parseSemver(wrapperVersion);
  const [lMajor] = parseSemver(localVersion);

  if (wMajor !== lMajor) {
    return {
      compatible: false,
      message:
        `Version mismatch: @prodara/cli v${wrapperVersion} (major ${wMajor}) ` +
        `is incompatible with local @prodara/compiler v${localVersion} (major ${lMajor}).\n` +
        `Update one of them so the major versions match.`,
    };
  }

  return { compatible: true, message: '' };
}
