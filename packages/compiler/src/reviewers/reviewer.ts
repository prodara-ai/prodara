// ---------------------------------------------------------------------------
// Prodara Compiler — Reviewer Agent Framework
// ---------------------------------------------------------------------------
// Provides the base interface and execution logic for built-in and custom
// reviewer agents. Each reviewer inspects the Product Graph and produces
// deterministic findings. When an agent driver is available, the review/fix
// loop will attempt to fix actionable findings.

import type { ProductGraph } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ResolvedReviewerConfig, ResolvedReviewFixConfig } from '../config/config.js';
import type { AgentDriver, AgentRequest } from '../agent/types.js';
import type { FindingSeverity, ReviewFinding, ReviewResult, ReviewCycleResult, FixAttemptResult } from './types.js';

// ---------------------------------------------------------------------------
// Reviewer agent interface
// ---------------------------------------------------------------------------

export interface ReviewerAgent {
  readonly name: string;
  readonly description: string;
  review(graph: ProductGraph, spec: IncrementalSpec): readonly ReviewFinding[];
}

// ---------------------------------------------------------------------------
// Run all enabled reviewers
// ---------------------------------------------------------------------------

export function runReviewers(
  agents: readonly ReviewerAgent[],
  configs: Readonly<Record<string, ResolvedReviewerConfig | undefined>>,
  graph: ProductGraph,
  spec: IncrementalSpec,
): ReviewResult[] {
  const results: ReviewResult[] = [];

  for (const agent of agents) {
    const cfg = configs[agent.name];
    if (cfg && !cfg.enabled) continue;

    const findings = agent.review(graph, spec);
    const passed = !findings.some((f) => f.severity === 'error' || f.severity === 'critical');
    results.push({ reviewer: agent.name, passed, findings });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fix prompt builder
// ---------------------------------------------------------------------------

/**
 * Build a structured fix prompt from review findings.
 * Only includes findings matching the configured severity threshold.
 */
export function buildFixPrompt(
  findings: readonly ReviewFinding[],
  fixSeverity: readonly FindingSeverity[],
): string {
  const actionable = findings.filter((f) => fixSeverity.includes(f.severity));
  if (actionable.length === 0) return '';

  const sections: string[] = [];
  sections.push('# Fix Request');
  sections.push('');
  sections.push(`The following ${actionable.length} finding(s) require fixes:`);
  sections.push('');

  for (const f of actionable) {
    sections.push(`## [${f.severity.toUpperCase()}] ${f.reviewer}: ${f.category}`);
    if (f.nodeId) sections.push(`Node: ${f.nodeId}`);
    sections.push(f.message);
    if (f.suggestion) sections.push(`Suggestion: ${f.suggestion}`);
    sections.push('');
  }

  sections.push('Apply fixes that resolve these findings without introducing regressions.');
  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Fix attempt execution
// ---------------------------------------------------------------------------

/**
 * Attempt to fix actionable findings via an agent driver.
 * Returns the result of the attempt.
 */
export async function runFixAttempt(
  driver: AgentDriver,
  findings: readonly ReviewFinding[],
  fixSeverity: readonly FindingSeverity[],
  graph: ProductGraph,
  iteration: number,
): Promise<FixAttemptResult> {
  const prompt = buildFixPrompt(findings, fixSeverity);

  if (!prompt) {
    return { iteration, status: 'skipped', findingsAddressed: 0, duration_ms: 0 };
  }

  const actionableCount = findings.filter((f) => fixSeverity.includes(f.severity)).length;

  const request: AgentRequest = {
    prompt,
    context: {
      constitution: null,
      graphSlice: JSON.stringify({ nodeCount: graph.modules.length, edgeCount: graph.edges.length }),
      governance: null,
      additionalContext: {},
    },
    capability: 'fix',
    platform: driver.platform,
  };

  const start = Date.now();
  const response = await driver.execute(request);
  const duration_ms = Date.now() - start;

  return {
    iteration,
    status: response.status,
    findingsAddressed: response.status === 'success' ? actionableCount : 0,
    duration_ms,
  };
}

// ---------------------------------------------------------------------------
// Review/fix loop
// ---------------------------------------------------------------------------

export interface ReviewFixLoopOptions {
  readonly driver?: AgentDriver;
  readonly fixSeverity?: readonly FindingSeverity[];
}

/**
 * Run the review/fix loop. Each iteration:
 * 1. Run all enabled reviewers
 * 2. If accepted (no error/critical findings), stop
 * 3. When agent driver is available, attempt to fix actionable findings
 * 4. Record the cycle and continue to next iteration
 */
export function runReviewFixLoop(
  agents: readonly ReviewerAgent[],
  configs: Readonly<Record<string, ResolvedReviewerConfig | undefined>>,
  graph: ProductGraph,
  spec: IncrementalSpec,
  maxIterations: number,
  loopOptions?: ReviewFixLoopOptions,
): readonly ReviewCycleResult[] {
  const cycles: ReviewCycleResult[] = [];

  for (let i = 1; i <= maxIterations; i++) {
    const results = runReviewers(agents, configs, graph, spec);
    const allFindings = results.flatMap((r) => r.findings);
    const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
    const errorCount = allFindings.filter((f) => f.severity === 'error').length;
    const warningCount = allFindings.filter((f) => f.severity === 'warning').length;
    const accepted = criticalCount === 0 && errorCount === 0;

    cycles.push({
      iteration: i,
      results,
      accepted,
      totalFindings: allFindings.length,
      criticalCount,
      errorCount,
      warningCount,
      fixAttempt: null,
    });

    if (accepted) break;
    if (i >= maxIterations) break;
  }

  return cycles;
}

/**
 * Async review/fix loop with agent-driven fix attempts.
 * Falls back to the sync loop when no driver is provided.
 */
export async function runReviewFixLoopAsync(
  agents: readonly ReviewerAgent[],
  configs: Readonly<Record<string, ResolvedReviewerConfig | undefined>>,
  graph: ProductGraph,
  spec: IncrementalSpec,
  reviewFixConfig: ResolvedReviewFixConfig,
  driver: AgentDriver,
): Promise<readonly ReviewCycleResult[]> {
  const cycles: ReviewCycleResult[] = [];

  for (let i = 1; i <= reviewFixConfig.maxIterations; i++) {
    const results = runReviewers(agents, configs, graph, spec);
    const allFindings = results.flatMap((r) => r.findings);
    const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
    const errorCount = allFindings.filter((f) => f.severity === 'error').length;
    const warningCount = allFindings.filter((f) => f.severity === 'warning').length;
    const accepted = criticalCount === 0 && errorCount === 0;

    if (accepted) {
      cycles.push({
        iteration: i, results, accepted, totalFindings: allFindings.length,
        criticalCount, errorCount, warningCount, fixAttempt: null,
      });
      break;
    }

    // Attempt fix
    const fixResult = await runFixAttempt(
      driver, allFindings, reviewFixConfig.fixSeverity, graph, i,
    );

    cycles.push({
      iteration: i, results, accepted, totalFindings: allFindings.length,
      criticalCount, errorCount, warningCount, fixAttempt: fixResult,
    });

    if (i >= reviewFixConfig.maxIterations) break;
  }

  return cycles;
}
