// ---------------------------------------------------------------------------
// Prodara Compiler — Validation Executor
// ---------------------------------------------------------------------------
// Runs configured validation commands (lint, typecheck, test, build)
// in the project directory. Commands run with shell=false to prevent
// injection. Order: lint → typecheck → test → build.

import { execFileSync } from 'node:child_process';
import type { ResolvedValidationConfig } from '../config/config.js';
import type { ValidationCommandResult, ValidationResult, ValidationStep, ValidationStatus } from './types.js';

const STEP_ORDER: readonly ValidationStep[] = ['lint', 'typecheck', 'test', 'build'];

const DEFAULT_TIMEOUTS: Record<ValidationStep, number> = {
  lint: 60_000,
  typecheck: 60_000,
  test: 300_000,
  build: 300_000,
};

/**
 * Run all configured validation commands in order.
 * Returns immediately if no commands are configured.
 */
export function runValidation(
  config: ResolvedValidationConfig,
  cwd: string,
): ValidationResult {
  const results: ValidationCommandResult[] = [];

  for (const step of STEP_ORDER) {
    const command = config[step];
    if (!command) {
      results.push({
        step,
        command: '',
        status: 'skipped',
        exitCode: null,
        stdout: '',
        stderr: '',
        duration_ms: 0,
      });
      continue;
    }

    results.push(executeCommand(step, command, cwd));
  }

  const passed = results.every(r => r.status === 'passed' || r.status === 'skipped');
  return { passed, results };
}

function executeCommand(
  step: ValidationStep,
  command: string,
  cwd: string,
): ValidationCommandResult {
  const timeout = DEFAULT_TIMEOUTS[step];
  const parts = parseCommand(command);
  if (parts.length === 0) {
    return {
      step,
      command,
      status: 'skipped',
      exitCode: null,
      stdout: '',
      stderr: '',
      duration_ms: 0,
    };
  }

  const [cmd, ...args] = parts;
  const start = Date.now();

  try {
    const stdout = execFileSync(cmd!, args, {
      cwd,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    return {
      step,
      command,
      status: 'passed',
      exitCode: 0,
      /* v8 ignore next -- execFileSync with encoding always returns string */
      stdout: stdout ?? '',
      stderr: '',
      duration_ms: Date.now() - start,
    };
  } catch (err: unknown) {
    const duration_ms = Date.now() - start;
    const error = err as { status?: number; stdout?: string; stderr?: string; killed?: boolean };

    let status: ValidationStatus = 'failed';
    /* v8 ignore next 3 -- timeout requires real I/O delay; tested via integration */
    if (error.killed) {
      status = 'timeout';
    }

    return {
      step,
      command,
      status,
      exitCode: error.status ?? 1,
      stdout: typeof error.stdout === 'string' ? error.stdout : '',
      stderr: typeof error.stderr === 'string' ? error.stderr : '',
      duration_ms,
    };
  }
}

/**
 * Parse a command string into executable and arguments.
 * Simple whitespace splitting — does not support shell features.
 */
function parseCommand(command: string): string[] {
  return command.trim().split(/\s+/).filter(Boolean);
}
