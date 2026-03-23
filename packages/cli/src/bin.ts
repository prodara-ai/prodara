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

import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
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

/**
 * Bootstrap a project for `prodara init` when no local compiler exists.
 * Creates package.json if missing, installs @prodara/compiler, and returns
 * true on success. Sets process.exitCode and returns false on failure.
 */
export function bootstrapInit(cwd: string, wrapperVersion: string): boolean {
  const pkgJsonPath = join(cwd, 'package.json');

  // 1. Ensure package.json exists
  if (!existsSync(pkgJsonPath)) {
    process.stderr.write(pc.cyan('ℹ') + ' No package.json found — running npm init...\n');
    try {
      execSync('npm init -y', { cwd, stdio: 'pipe' });
      process.stderr.write(pc.green('✓') + ' Created package.json\n');
    } catch {
      process.stderr.write(pc.red('✗') + ' Failed to initialize npm project.\n');
      process.stderr.write('  Run ' + pc.cyan('npm init') + ' manually, then retry.\n');
      process.exitCode = 1;
      return false;
    }
  }

  // 2. Install @prodara/compiler
  process.stderr.write(pc.cyan('ℹ') + ' Installing @prodara/compiler...\n');
  try {
    execSync('npm install --save-dev @prodara/compiler', { cwd, stdio: 'pipe' });
    process.stderr.write(pc.green('✓') + ' Installed @prodara/compiler\n');
  } catch {
    process.stderr.write(pc.red('✗') + ' Failed to install @prodara/compiler.\n');
    process.stderr.write(
      '  Install it manually:\n' +
      '    ' + pc.cyan('npm install --save-dev @prodara/compiler') + '\n' +
      '  Then run ' + pc.cyan('prodara init --skip-install') + '\n',
    );
    process.exitCode = 1;
    return false;
  }

  // 3. Verify installation
  const freshLocal = resolveLocal(cwd);
  if (!freshLocal) {
    process.stderr.write(pc.red('✗') + ' Installed @prodara/compiler but could not resolve it.\n');
    process.stderr.write(`@prodara/cli v${wrapperVersion}\n`);
    process.exitCode = 1;
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Command definitions for help output
// ---------------------------------------------------------------------------

interface CommandDef {
  readonly name: string;
  readonly description: string;
}

const COMMAND_GROUPS: { group: string; commands: CommandDef[] }[] = [
  {
    group: 'Core',
    commands: [
      { name: 'build',     description: 'Full build pipeline: compile → workflow → review → verify' },
      { name: 'init',      description: 'Scaffold a new Prodara project' },
      { name: 'validate',  description: 'Parse and validate .prd files without building' },
      { name: 'graph',     description: 'Compile .prd files and output the Product Graph' },
      { name: 'plan',      description: 'Compile and produce an incremental plan' },
      { name: 'test',      description: 'Run spec tests defined in .prd files' },
    ],
  },
  {
    group: 'Analysis',
    commands: [
      { name: 'diff',      description: 'Show incremental diff between current and previous graph' },
      { name: 'drift',     description: 'Detect if specs have drifted from last build' },
      { name: 'analyze',   description: 'Run cross-spec consistency and coverage analysis' },
      { name: 'doctor',    description: 'Check compiler installation and workspace health' },
      { name: 'dashboard', description: 'Show project overview dashboard' },
    ],
  },
  {
    group: 'Exploration',
    commands: [
      { name: 'explain',   description: 'Explain a node in the product graph by ID' },
      { name: 'why',       description: 'Explain why a diagnostic code was reported' },
      { name: 'onboard',   description: 'Generate a guided walkthrough for new team members' },
      { name: 'checklist', description: 'Generate a quality validation checklist' },
    ],
  },
  {
    group: 'Change Management',
    commands: [
      { name: 'propose',   description: 'Create a new change proposal' },
      { name: 'changes',   description: 'List active change proposals' },
      { name: 'apply',     description: 'Apply a change proposal' },
      { name: 'archive',   description: 'Archive a completed change proposal' },
    ],
  },
  {
    group: 'Utilities',
    commands: [
      { name: 'watch',     description: 'Watch .prd files and re-compile on changes' },
      { name: 'clarify',   description: 'Identify specification ambiguities' },
      { name: 'docs',      description: 'Generate markdown docs from .prd specifications' },
      { name: 'history',   description: 'Browse past build runs' },
      { name: 'extension', description: 'Manage Prodara extensions (list, add, remove)' },
      { name: 'preset',    description: 'Manage Prodara presets (list, add, remove)' },
    ],
  },
];

// ---------------------------------------------------------------------------
// help / version output
// ---------------------------------------------------------------------------

export function printHelp(version: string): void {
  const border = pc.dim('─'.repeat(60));
  const lines: string[] = [];

  lines.push('');
  lines.push(pc.bold('  Prodara CLI') + pc.dim(` v${version}`));
  lines.push(pc.dim('  The spec-driven compiler for product engineering'));
  lines.push('');
  lines.push(border);
  lines.push('');
  lines.push(pc.bold('  Usage: ') + 'prodara ' + pc.cyan('<command>') + ' [options]');
  lines.push('');

  // Compute column width for alignment
  const maxName = Math.max(...COMMAND_GROUPS.flatMap(g => g.commands.map(c => c.name.length)));

  for (const { group, commands } of COMMAND_GROUPS) {
    lines.push(pc.bold(`  ${group}`));
    for (const cmd of commands) {
      const padded = cmd.name.padEnd(maxName + 2);
      lines.push(`    ${pc.green(padded)}${pc.dim(cmd.description)}`);
    }
    lines.push('');
  }

  lines.push(pc.bold('  Global Options'));
  lines.push(`    ${pc.green('help'.padEnd(maxName + 2))}${pc.dim('Show this help message')}`);
  lines.push(`    ${pc.green('version'.padEnd(maxName + 2))}${pc.dim('Show CLI and compiler versions')}`);
  lines.push('');
  lines.push(border);
  lines.push('');
  lines.push(pc.dim('  Run ') + pc.cyan('prodara <command> --help') + pc.dim(' for command-specific usage.'));
  lines.push('');

  process.stdout.write(lines.join('\n'));
}

export function printVersion(wrapperVersion: string, localVersion: string | null): void {
  const lines: string[] = [];
  lines.push(`${pc.bold('@prodara/cli')}      ${pc.green(`v${wrapperVersion}`)}`);
  if (localVersion) {
    lines.push(`${pc.bold('@prodara/compiler')} ${pc.green(`v${localVersion}`)}`);
  } else {
    lines.push(`${pc.bold('@prodara/compiler')} ${pc.dim('not installed')}`);
  }
  process.stdout.write(lines.join('\n') + '\n');
}

export function main(): void {
  const cwd = process.cwd();
  const local = resolveLocal(cwd);
  const wrapperVersion = getWrapperVersion();

  const args = process.argv.slice(2);

  // Intercept help and version before delegation
  const firstArg = args[0];
  if (firstArg === 'help' || firstArg === '--help' || firstArg === '-h') {
    printHelp(wrapperVersion);
    process.exitCode = 0;
    return;
  }

  if (firstArg === 'version' || firstArg === '--version' || firstArg === '-V') {
    printVersion(wrapperVersion, local?.version ?? null);
    process.exitCode = 0;
    return;
  }

  if (!local) {
    // Special-case: `prodara init` bootstraps a project even without a local
    // compiler. We install @prodara/compiler locally first, then delegate to
    // the now-local compiler's init (with --skip-install since we did it).
    if (args[0] === 'init') {
      const installed = bootstrapInit(cwd, wrapperVersion);
      if (!installed) return; // bootstrapInit sets exitCode on failure

      // Re-resolve the just-installed compiler and delegate
      const freshLocal = resolveLocal(cwd);
      if (freshLocal && existsSync(freshLocal.cliEntry)) {
        // Append --skip-install so the compiler's init doesn't redo npm/install
        const initArgs = args.includes('--skip-install') ? args : [...args, '--skip-install'];
        try {
          execFileSync(process.execPath, [freshLocal.cliEntry, ...initArgs], {
            cwd,
            stdio: 'inherit',
            env: process.env,
          });
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'status' in err) {
            process.exitCode = (err as { status: number }).status;
          } else {
            process.exitCode = 1;
          }
        }
        return;
      }

      // Shouldn't reach here — resolution just succeeded in bootstrapInit
      process.stderr.write(pc.red('Error: Compiler installed but could not resolve its CLI entry.\n'));
      process.exitCode = 1;
      return;
    }

    process.stderr.write(
      'Error: Could not find a local installation of @prodara/compiler.\n' +
      '\n' +
      'To set up a Prodara project:\n' +
      '  prodara init\n' +
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

/* v8 ignore next 5 -- auto-invoked entry point */
try {
  if (process.argv[1] && realpathSync(process.argv[1]) === __filename) main();
} catch {
  // realpathSync may fail if argv[1] is not a real path
}