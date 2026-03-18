// ---------------------------------------------------------------------------
// Prodara Compiler — Build Orchestrator
// ---------------------------------------------------------------------------
// Coordinates the full build pipeline: compile → plan → test → summarize.
// This is the engine behind `prodara build`. It produces a BuildRun record
// and a human/machine-readable BuildSummary.
//
// Generation dispatch and review/fix loops are defined as contracts here
// (ready for future generator implementations) but not executed in v0.1.

import type { BuildInput, BuildRun, BuildSummary, PhaseSummary } from './types.js';

const COMPILER_VERSION = '0.1.0';

/**
 * Produce a build run record from the compilation results.
 */
export function createBuildRun(input: BuildInput): BuildRun {
  const now = new Date().toISOString();
  const status = input.errorCount > 0
    ? 'failed'
    : input.testResults.totalFailed > 0
      ? 'partial'
      : 'success';

  return {
    status,
    started_at: now,
    finished_at: now,
    compiler_version: COMPILER_VERSION,
    phases_completed: buildPhaseList(input),
    file_count: input.fileCount,
    node_count: countNodes(input),
    edge_count: input.graph.edges.length,
    error_count: input.errorCount,
    warning_count: input.warningCount,
    test_passed: input.testResults.totalPassed,
    test_failed: input.testResults.totalFailed,
    plan_task_count: input.plan.tasks.length,
  };
}

/**
 * Produce a human/machine-readable build summary.
 */
export function createBuildSummary(input: BuildInput): BuildSummary {
  const build = createBuildRun(input);
  const phases: PhaseSummary[] = [];

  // Validate phase
  const moduleCount = input.graph.modules.length;
  if (input.errorCount > 0) {
    phases.push({ name: 'Validate', status: 'error', detail: `${input.errorCount} error(s)` });
  } else if (input.warningCount > 0) {
    phases.push({ name: 'Validate', status: 'warn', detail: `${moduleCount} modules, ${input.warningCount} warning(s)` });
  } else {
    phases.push({ name: 'Validate', status: 'ok', detail: `${moduleCount} modules, 0 errors` });
  }

  // Graph phase
  phases.push({
    name: 'Graph',
    status: input.errorCount > 0 ? 'skipped' : 'ok',
    detail: input.errorCount > 0 ? 'skipped due to errors' : `${build.node_count} nodes, ${build.edge_count} edges`,
  });

  // Implement phase (plan)
  const newTasks = input.plan.tasks.filter((t) => t.action === 'generate').length;
  const updateTasks = input.plan.tasks.filter((t) => t.action === 'regenerate').length;
  const unchangedTasks = input.plan.tasks.filter((t) => t.action === 'verify').length;
  phases.push({
    name: 'Implement',
    status: input.errorCount > 0 ? 'skipped' : 'ok',
    detail: input.errorCount > 0
      ? 'skipped due to errors'
      : `${input.plan.tasks.length} tasks (${newTasks} new, ${updateTasks} changed, ${unchangedTasks} unchanged)`,
  });

  // Test phase
  if (input.errorCount > 0) {
    phases.push({ name: 'Test', status: 'skipped', detail: 'skipped due to errors' });
  } else if (input.testResults.totalFailed > 0) {
    phases.push({ name: 'Test', status: 'error', detail: `${input.testResults.totalPassed} passed, ${input.testResults.totalFailed} failed` });
  } else {
    phases.push({ name: 'Test', status: 'ok', detail: `${input.testResults.totalPassed} passed, 0 failed` });
  }

  return { status: build.status, phases, build };
}

/**
 * Format the build summary for human-readable CLI output.
 */
export function formatBuildSummary(summary: BuildSummary, productName: string): string {
  const lines: string[] = [];
  lines.push(`Prodara Build — ${productName}`);
  lines.push('');

  for (const phase of summary.phases) {
    const icon = phase.status === 'ok' ? '✓' : phase.status === 'warn' ? '⚠' : phase.status === 'error' ? '✗' : '○';
    lines.push(`  ${icon} ${phase.name.padEnd(12)} ${phase.detail}`);
  }

  lines.push('');
  if (summary.status === 'success') {
    lines.push('Build complete.');
  } else if (summary.status === 'partial') {
    lines.push('Build completed with test failures.');
  } else {
    lines.push('Build failed.');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countNodes(input: BuildInput): number {
  let count = 1; // product node
  for (const mod of input.graph.modules) {
    count++; // module node
    for (const [key, value] of Object.entries(mod)) {
      if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
      if (Array.isArray(value)) count += value.length;
    }
  }
  return count;
}

function buildPhaseList(input: BuildInput): string[] {
  const phases = ['discovery', 'lexing', 'parsing', 'binding', 'type_checking', 'validation', 'graph'];
  if (input.errorCount === 0) {
    phases.push('graph_validation', 'planning', 'testing');
  }
  return phases;
}
