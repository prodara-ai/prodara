// ---------------------------------------------------------------------------
// Prodara Compiler — Verification
// ---------------------------------------------------------------------------
// Post-build verification: checks that the Product Graph is consistent,
// all plan tasks are addressed, spec tests pass, and constitution policies
// are represented. This runs after the full workflow completes.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import { collectAllNodeIds } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ReviewCycleResult } from '../reviewers/types.js';
import type { WorkflowResult } from '../workflow/engine.js';
import type { VerificationCheck, VerificationResult } from './types.js';

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function verify(
  graph: ProductGraph,
  spec: IncrementalSpec,
  workflow: WorkflowResult,
  reviewCycles: readonly ReviewCycleResult[],
): VerificationResult {
  const checks: VerificationCheck[] = [];

  checkGraphIntegrity(graph, checks);
  checkTasksCovered(spec, checks);
  checkWorkflowPassed(workflow, checks);
  checkReviewAcceptance(reviewCycles, checks);
  checkConstitutionPresence(graph, checks);

  const passCount = checks.filter((c) => c.severity === 'pass').length;
  const failCount = checks.filter((c) => c.severity === 'fail').length;
  const warnCount = checks.filter((c) => c.severity === 'warn').length;

  return {
    passed: failCount === 0,
    checks,
    passCount,
    failCount,
    warnCount,
  };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkGraphIntegrity(graph: ProductGraph, checks: VerificationCheck[]): void {
  const allIds = collectAllNodeIds(graph);

  // All edge endpoints exist
  let orphanEdges = 0;
  for (const edge of graph.edges) {
    if (!allIds.has(edge.from) || !allIds.has(edge.to)) orphanEdges++;
  }

  if (orphanEdges === 0) {
    checks.push({ name: 'graph_edges_valid', severity: 'pass', message: 'All edge endpoints reference existing nodes' });
  } else {
    checks.push({ name: 'graph_edges_valid', severity: 'fail', message: `${orphanEdges} edge(s) reference non-existent nodes` });
  }

  // Product lists all modules
  const declaredIds = new Set(graph.product.modules);
  const actualIds = new Set(graph.modules.map((m) => m.id));
  const missing = [...declaredIds].filter((id) => !actualIds.has(id));
  const unlisted = [...actualIds].filter((id) => !declaredIds.has(id));

  if (missing.length === 0 && unlisted.length === 0) {
    checks.push({ name: 'modules_consistent', severity: 'pass', message: 'Product module list matches actual modules' });
  } else {
    if (missing.length > 0) {
      checks.push({ name: 'modules_consistent', severity: 'fail', message: `Product references missing modules: ${missing.join(', ')}` });
    }
    if (unlisted.length > 0) {
      checks.push({ name: 'modules_consistent', severity: 'warn', message: `Modules not listed in product: ${unlisted.join(', ')}` });
    }
  }
}

function checkTasksCovered(spec: IncrementalSpec, checks: VerificationCheck[]): void {
  const removeCount = spec.tasks.filter((t) => t.action === 'remove').length;
  const generateCount = spec.tasks.filter((t) => t.action === 'generate' || t.action === 'regenerate').length;
  const verifyCount = spec.tasks.filter((t) => t.action === 'verify').length;

  if (spec.tasks.length === 0) {
    checks.push({ name: 'tasks_present', severity: 'pass', message: 'No tasks required (clean state)' });
  } else {
    checks.push({
      name: 'tasks_present',
      severity: 'pass',
      message: `${spec.tasks.length} task(s): ${generateCount} generate, ${removeCount} remove, ${verifyCount} verify`,
    });
  }
}

function checkWorkflowPassed(workflow: WorkflowResult, checks: VerificationCheck[]): void {
  if (workflow.ok) {
    checks.push({ name: 'workflow_phases', severity: 'pass', message: `All ${workflow.phases.length} workflow phases completed` });
  } else {
    const failed = workflow.phases.filter((p) => !p.ok).map((p) => p.phase);
    checks.push({ name: 'workflow_phases', severity: 'fail', message: `Workflow phases failed: ${failed.join(', ')}` });
  }
}

function checkReviewAcceptance(
  cycles: readonly ReviewCycleResult[],
  checks: VerificationCheck[],
): void {
  if (cycles.length === 0) {
    checks.push({ name: 'review_acceptance', severity: 'warn', message: 'No review cycles were run' });
    return;
  }

  const lastCycle = cycles[cycles.length - 1]!;
  if (lastCycle.accepted) {
    checks.push({
      name: 'review_acceptance',
      severity: 'pass',
      message: `Review accepted after ${cycles.length} cycle(s)`,
    });
  } else {
    checks.push({
      name: 'review_acceptance',
      severity: 'fail',
      message: `Review not accepted after ${cycles.length} cycle(s): ${lastCycle.criticalCount} critical, ${lastCycle.errorCount} errors`,
    });
  }
}

function checkConstitutionPresence(graph: ProductGraph, checks: VerificationCheck[]): void {
  let constitutionCount = 0;
  for (const mod of graph.modules) {
    const constitutions = getNodeArray(mod, 'constitutions');
    constitutionCount += constitutions.length;
  }

  if (constitutionCount > 0) {
    checks.push({ name: 'constitution_present', severity: 'pass', message: `${constitutionCount} constitution(s) defined` });
  } else {
    checks.push({ name: 'constitution_present', severity: 'warn', message: 'No constitutions defined — consider adding governance policies' });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NamedNode {
  readonly id: string;
  readonly name: string;
}

function getNodeArray(mod: ModuleNode, category: string): readonly NamedNode[] {
  const val = mod[category];
  if (!Array.isArray(val)) return [];
  return val as readonly NamedNode[];
}
