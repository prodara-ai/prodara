#!/usr/bin/env node
// ---------------------------------------------------------------------------
// @prodara/cli — Entry Point (thin wrapper)
// ---------------------------------------------------------------------------
// This is the global `prodara` command. Its job:
//   1. Resolve the project-local @prodara/compiler installation
//   2. Delegate to the local CLI binary
//   3. If no local install exists, provide a helpful error
//
// This mirrors the Angular CLI delegation pattern — the global wrapper
// finds and exec's the local compiler so users always run the version
// pinned in their project's package.json.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLocal, checkVersionCompatibility } from './resolve.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getWrapperVersion(): string {
  const pkgPath = resolve(__dirname, '..', 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const raw = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(raw) as { version?: string };
      return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
  return '0.0.0';
}

function main(): void {
  const cwd = process.cwd();
  const local = resolveLocal(cwd);
  const wrapperVersion = getWrapperVersion();

  if (!local) {
    process.stderr.write(
      'Error: Could not find a local installation of @prodara/compiler.\n' +
      '\n' +
      'To set up a Prodara project:\n' +
      '  npm install --save-dev @prodara/compiler\n' +
      '  npx prodara init\n' +
      '\n' +
      `@prodara/cli v${wrapperVersion}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // Check version compatibility
  const compat = checkVersionCompatibility(wrapperVersion, local.version);
  if (!compat.compatible) {
    process.stderr.write(`Warning: ${compat.message}\n\n`);
    // Still attempt delegation — only hard-fail on truly broken resolution
  }

  // Check that the local CLI entry exists (package may not be built)
  if (!existsSync(local.cliEntry)) {
    process.stderr.write(
      `Error: Found @prodara/compiler v${local.version} at ${local.packageDir}\n` +
      'but the CLI binary is not built.\n' +
      '\n' +
      'Try: cd <project-root> && npm run build --workspace=packages/compiler\n' +
      'Or:  npx prodara <command>  (uses the local bin directly)\n',
    );
    process.exitCode = 1;
    return;
  }

  // Delegate to the local compiler CLI
  const args = process.argv.slice(2);
  try {
    execFileSync(process.execPath, [local.cliEntry, ...args], {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });
  } catch (err: unknown) {
    // execFileSync throws if exit code is non-zero; propagate it
    if (err && typeof err === 'object' && 'status' in err) {
      process.exitCode = (err as { status: number }).status;
    } else {
      process.exitCode = 1;
    }
  }
}

main();
