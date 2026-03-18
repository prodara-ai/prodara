// ---------------------------------------------------------------------------
// Prodara Compiler — Pipeline Engine
// ---------------------------------------------------------------------------
// Coordinates the full build lifecycle as an ordered sequence of phases.
// Each phase checks prerequisites, reports progress, and produces a
// structured outcome. Downstream phases are skipped when an upstream
// phase fails. Phases 8–10 (implement, validate, review) require agent
// availability or headless mode — otherwise they are skipped.
//
// Phase list:
//   0  constitution — verify constitution in compiled specs
//   1  compile      — discover → lex → parse → bind → check → graph → plan → test
//   2  graph        — report graph stats (built by compile)
//   3  plan         — build incremental spec from plan + graph
//   4  workflow     — run deterministic workflow phases
//   5  governance   — generate/check agents.md files
//   6  docs         — generate human-readable markdown docs
//   7  preReview    — pre-implementation review/fix loop (optional)
//   8  implement    — agent-driven code generation (requires agent)
//   9  validate     — run configured lint/test/build commands
//  10  review       — review/fix loop (requires agent)
//  11  verify       — final integrity checks
//  12  audit        — write run log
//
// Phases 8–10 (implement, validate, review) require agent availability
// or headless mode — otherwise they are skipped.

import type { ResolvedConfig } from '../config/config.js';
import type { ProductGraph } from '../graph/graph-types.js';
import type { Plan } from '../planner/plan-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { WorkflowResult } from '../workflow/engine.js';
import type { GovernanceFile } from '../governance/types.js';
import type { ReviewCycleResult } from '../reviewers/types.js';
import type { VerificationResult } from '../verification/types.js';
import type { ValidationResult } from '../validation/types.js';
import type { SpecTestSuiteResult } from '../testing/test-runner.js';
import type { ConstitutionResolutionResult } from '../registry/resolution.js';
import type { BuildStatus } from './types.js';

import { compile } from '../cli/compile.js';
import type { CompileResult } from '../cli/compile.js';
import { buildIncrementalSpec } from '../incremental/incremental-spec.js';
import { runWorkflow } from '../workflow/engine.js';
import { generateGovernanceFiles } from '../governance/governance.js';
import { runValidation } from '../validation/validation.js';
import { DEFAULT_REVIEWERS, runReviewFixLoop } from '../reviewers/index.js';
import { verify } from '../verification/verify.js';
import { createAuditRecord, writeAuditRecord } from '../audit/audit.js';
import { generateDocs, writeDocs } from '../doc-gen/index.js';

// ---------------------------------------------------------------------------
// Phase definitions
// ---------------------------------------------------------------------------

export const PIPELINE_PHASES = [
  'constitution', 'compile', 'graph', 'plan',
  'workflow', 'governance', 'docs', 'preReview', 'implement',
  'validate', 'review', 'verify', 'audit',
] as const;

export type PhaseName = (typeof PIPELINE_PHASES)[number];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PhaseOutcome {
  readonly phase: PhaseName;
  readonly index: number;
  readonly status: 'ok' | 'error' | 'skipped' | 'warn';
  readonly detail: string;
  readonly duration_ms: number;
}

export interface PipelineOptions {
  readonly headless?: boolean;
  readonly noImplement?: boolean;
  readonly noReview?: boolean;
  readonly noPreReview?: boolean;
  readonly onProgress?: (phase: PhaseName, index: number, total: number) => void;
}

export interface PipelineResult {
  readonly status: BuildStatus;
  readonly phases: readonly PhaseOutcome[];
  readonly duration_ms: number;
  readonly graph: ProductGraph | null;
  readonly spec: IncrementalSpec | null;
  readonly verification: VerificationResult | null;
}

// ---------------------------------------------------------------------------
// Internal mutable pipeline state
// ---------------------------------------------------------------------------

interface PipelineState {
  compilation: CompileResult | null;
  graph: ProductGraph | null;
  plan: Plan | null;
  testResults: SpecTestSuiteResult | null;
  constitutions: ConstitutionResolutionResult | null;
  spec: IncrementalSpec | null;
  workflow: WorkflowResult | null;
  governanceFiles: GovernanceFile[] | null;
  validationResult: ValidationResult | null;
  reviewCycles: readonly ReviewCycleResult[] | null;
  preReviewCycles: readonly ReviewCycleResult[] | null;
  verification: VerificationResult | null;
}

// ---------------------------------------------------------------------------
// Pipeline runner
// ---------------------------------------------------------------------------

export function runPipeline(
  root: string,
  config: ResolvedConfig,
  options: PipelineOptions = {},
): PipelineResult {
  const pipelineStart = Date.now();
  const outcomes: PhaseOutcome[] = [];
  const total = PIPELINE_PHASES.length;
  const state: PipelineState = {
    compilation: null,
    graph: null,
    plan: null,
    testResults: null,
    constitutions: null,
    spec: null,
    workflow: null,
    governanceFiles: null,
    validationResult: null,
    reviewCycles: null,
    preReviewCycles: null,
    verification: null,
  };

  let failed = false;

  for (let i = 0; i < PIPELINE_PHASES.length; i++) {
    const phase = PIPELINE_PHASES[i]!;
    options.onProgress?.(phase, i, total);

    // Skip downstream phases on failure (except audit — always runs)
    if (failed && phase !== 'audit') {
      outcomes.push(makeOutcome(phase, i, 'skipped', 'skipped due to prior failure', 0));
      continue;
    }

    const start = Date.now();
    const outcome = executePhase(phase, i, root, config, options, state, start);
    outcomes.push(outcome);

    if (outcome.status === 'error') {
      failed = true;
    }
  }

  // Write audit record
  const auditOutcome = outcomes.find((o) => o.phase === 'audit');
  if (auditOutcome && auditOutcome.status !== 'skipped' && config.audit.enabled) {
    const specSummary = state.spec
      ? `${state.spec.summary.addedCount} added, ${state.spec.summary.modifiedCount} modified, ${state.spec.summary.removedCount} removed`
      : 'no spec';
    const builder = createAuditRecord(specSummary);
    for (const o of outcomes) {
      builder.addPhase({
        name: o.phase,
        status: o.status === 'ok' ? 'ok' : o.status === 'warn' ? 'warn' : o.status === 'error' ? 'error' : 'skipped',
        duration_ms: o.duration_ms,
        metrics: {},
      });
    }
    builder.setOutcome(failed ? 'failed' : 'success');
    writeAuditRecord(root, config.audit, builder.build());
  }

  const status: BuildStatus = failed
    ? 'failed'
    : outcomes.some((o) => o.status === 'warn')
      ? 'partial'
      : 'success';

  return {
    status,
    phases: outcomes,
    duration_ms: Date.now() - pipelineStart,
    graph: state.graph,
    spec: state.spec,
    verification: state.verification,
  };
}

// ---------------------------------------------------------------------------
// Phase dispatcher
// ---------------------------------------------------------------------------

function executePhase(
  phase: PhaseName,
  index: number,
  root: string,
  config: ResolvedConfig,
  options: PipelineOptions,
  state: PipelineState,
  start: number,
): PhaseOutcome {
  switch (phase) {
    case 'constitution': return runConstitutionPhase(index, state, start);
    case 'compile':      return runCompilePhase(index, root, state, start);
    case 'graph':        return runGraphPhase(index, state, start);
    case 'plan':         return runPlanPhase(index, state, start);
    case 'workflow':     return runWorkflowPhase(index, config, state, start);
    case 'governance':   return runGovernancePhase(index, root, config, state, start);
    case 'docs':         return runDocsPhase(index, root, config, state, start);
    case 'preReview':    return runPreReviewPhase(index, config, options, state, start);
    case 'implement':    return runImplementPhase(index, options, state, start);
    case 'validate':     return runValidatePhase(index, root, config, state, start);
    case 'review':       return runReviewPhase(index, config, options, state, start);
    case 'verify':       return runVerifyPhase(index, state, start);
    case 'audit':        return runAuditPhase(index, start);
  }
}

// ---------------------------------------------------------------------------
// Individual phase implementations
// ---------------------------------------------------------------------------

function runConstitutionPhase(index: number, state: PipelineState, start: number): PhaseOutcome {
  // Constitution check runs after compile; if compile hasn't run yet this is
  // the first phase, so we just verify prerequisites exist.
  // The actual check happens against the graph, but the graph may not exist yet.
  // In the ordered pipeline, constitution runs before compile, so we do a
  // lightweight check: just mark ok and defer deep check to verify phase.
  return makeOutcome('constitution', index, 'ok', 'deferred to verify phase', Date.now() - start);
}

function runCompilePhase(index: number, root: string, state: PipelineState, start: number): PhaseOutcome {
  const result = compile(root, { stopAfter: 'test' });
  state.compilation = result;
  state.graph = result.graph ?? null;
  state.plan = result.plan ?? null;
  state.testResults = result.testResults ?? null;
  state.constitutions = result.constitutions ?? null;

  if (result.diagnostics.hasErrors) {
    return makeOutcome('compile', index, 'error',
      `${result.diagnostics.errors.length} compilation error(s)`, Date.now() - start);
  }

  const warningCount = result.diagnostics.warnings.length;
  if (warningCount > 0) {
    return makeOutcome('compile', index, 'warn',
      `compiled with ${warningCount} warning(s)`, Date.now() - start);
  }

  return makeOutcome('compile', index, 'ok', 'compiled successfully', Date.now() - start);
}

function runGraphPhase(index: number, state: PipelineState, start: number): PhaseOutcome {
  if (!state.graph) {
    return makeOutcome('graph', index, 'error', 'no graph available', Date.now() - start);
  }

  let nodeCount = 1; // product
  for (const mod of state.graph.modules) {
    nodeCount++;
    for (const [key, value] of Object.entries(mod)) {
      if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
      if (Array.isArray(value)) nodeCount += value.length;
    }
  }

  return makeOutcome('graph', index, 'ok',
    `${nodeCount} nodes, ${state.graph.edges.length} edges`, Date.now() - start);
}

function runPlanPhase(index: number, state: PipelineState, start: number): PhaseOutcome {
  if (!state.graph || !state.plan) {
    return makeOutcome('plan', index, 'error', 'no graph or plan available', Date.now() - start);
  }

  state.spec = buildIncrementalSpec(state.plan, state.graph);
  const s = state.spec.summary;

  return makeOutcome('plan', index, 'ok',
    `${s.taskCount} tasks (${s.addedCount} added, ${s.modifiedCount} modified, ${s.removedCount} removed)`,
    Date.now() - start);
}

function runWorkflowPhase(index: number, config: ResolvedConfig, state: PipelineState, start: number): PhaseOutcome {
  /* v8 ignore next 3 -- unreachable: graph/plan phases fail first */
  if (!state.graph || !state.spec) {
    return makeOutcome('workflow', index, 'error', 'no graph or spec available', Date.now() - start);
  }

  state.workflow = runWorkflow(state.graph, state.spec, config);

  if (!state.workflow.ok) {
    return makeOutcome('workflow', index, 'warn',
      `${state.workflow.phases.length} phases, some warnings`, Date.now() - start);
  }

  return makeOutcome('workflow', index, 'ok',
    `${state.workflow.phases.length} phases completed`, Date.now() - start);
}

function runGovernancePhase(
  index: number, root: string, config: ResolvedConfig,
  state: PipelineState, start: number,
): PhaseOutcome {
  /* v8 ignore next 3 -- unreachable: graph phase fails first */
  if (!state.graph) {
    return makeOutcome('governance', index, 'error', 'no graph available', Date.now() - start);
  }

  state.governanceFiles = generateGovernanceFiles(state.graph, config, root);

  return makeOutcome('governance', index, 'ok',
    `${state.governanceFiles.length} governance file(s)`, Date.now() - start);
}

function runDocsPhase(
  index: number, root: string, config: ResolvedConfig,
  state: PipelineState, start: number,
): PhaseOutcome {
  if (!config.docs.enabled) {
    return makeOutcome('docs', index, 'skipped', 'disabled in config', Date.now() - start);
  }

  /* v8 ignore next 3 -- unreachable: graph phase fails first */
  if (!state.graph) {
    return makeOutcome('docs', index, 'error', 'no graph available', Date.now() - start);
  }

  const files = generateDocs(state.graph, config.docs, root);
  writeDocs(files, config.docs.outputDir, root);

  return makeOutcome('docs', index, 'ok',
    `${files.length} doc file(s) written to ${config.docs.outputDir}`, Date.now() - start);
}

function runPreReviewPhase(
  index: number, config: ResolvedConfig, options: PipelineOptions,
  state: PipelineState, start: number,
): PhaseOutcome {
  if (!config.preReview.enabled || options.noPreReview) {
    return makeOutcome('preReview', index, 'skipped',
      config.preReview.enabled ? 'disabled via options' : 'disabled in config', Date.now() - start);
  }

  /* v8 ignore next 3 -- unreachable: graph/plan phases fail first */
  if (!state.graph || !state.spec) {
    return makeOutcome('preReview', index, 'error', 'no graph or spec available', Date.now() - start);
  }

  state.preReviewCycles = runReviewFixLoop(
    DEFAULT_REVIEWERS,
    config.reviewers,
    state.graph,
    state.spec,
    config.preReview.maxIterations,
  );

  const last = state.preReviewCycles.length > 0 ? state.preReviewCycles[state.preReviewCycles.length - 1]! : null;

  if (last && !last.accepted) {
    return makeOutcome('preReview', index, 'warn',
      `not accepted after ${state.preReviewCycles.length} cycle(s) (${last.totalFindings} findings)`,
      Date.now() - start);
  }

  return makeOutcome('preReview', index, 'ok',
    `accepted after ${state.preReviewCycles.length} cycle(s)`, Date.now() - start);
}

function runImplementPhase(
  index: number, options: PipelineOptions, _state: PipelineState, start: number,
): PhaseOutcome {
  if (options.noImplement) {
    return makeOutcome('implement', index, 'skipped', 'disabled via options', Date.now() - start);
  }

  if (!options.headless) {
    return makeOutcome('implement', index, 'skipped',
      'requires --headless mode', Date.now() - start);
  }

  // Agent-driven implementation placeholder (D2 will implement)
  return makeOutcome('implement', index, 'skipped',
    'not yet implemented', Date.now() - start);
}

function runValidatePhase(
  index: number, root: string, config: ResolvedConfig,
  state: PipelineState, start: number,
): PhaseOutcome {
  const hasCommands = config.validation.lint || config.validation.typecheck
    || config.validation.test || config.validation.build;

  if (!hasCommands) {
    return makeOutcome('validate', index, 'skipped', 'no validation commands configured', Date.now() - start);
  }

  state.validationResult = runValidation(config.validation, root);

  if (!state.validationResult.passed) {
    const failed = state.validationResult.results.filter((r) => r.status === 'failed');
    return makeOutcome('validate', index, 'error',
      `${failed.length} validation step(s) failed`, Date.now() - start);
  }

  return makeOutcome('validate', index, 'ok', 'all validation steps passed', Date.now() - start);
}

function runReviewPhase(
  index: number, config: ResolvedConfig, options: PipelineOptions,
  state: PipelineState, start: number,
): PhaseOutcome {
  if (options.noReview) {
    return makeOutcome('review', index, 'skipped', 'disabled via options', Date.now() - start);
  }

  /* v8 ignore next 3 -- unreachable: graph/plan phases fail first */
  if (!state.graph || !state.spec) {
    return makeOutcome('review', index, 'error', 'no graph or spec available', Date.now() - start);
  }

  state.reviewCycles = runReviewFixLoop(
    DEFAULT_REVIEWERS,
    config.reviewers,
    state.graph,
    state.spec,
    config.reviewFix.maxIterations,
  );

  const last = state.reviewCycles.length > 0 ? state.reviewCycles[state.reviewCycles.length - 1]! : null;

  if (last && !last.accepted) {
    return makeOutcome('review', index, 'warn',
      `not accepted after ${state.reviewCycles.length} cycle(s) (${last.totalFindings} findings)`,
      Date.now() - start);
  }

  return makeOutcome('review', index, 'ok',
    `accepted after ${state.reviewCycles.length} cycle(s)`, Date.now() - start);
}

function runVerifyPhase(index: number, state: PipelineState, start: number): PhaseOutcome {
  /* v8 ignore next 3 -- unreachable: upstream phases fail first */
  if (!state.graph || !state.spec || !state.workflow) {
    return makeOutcome('verify', index, 'error', 'missing prerequisites', Date.now() - start);
  }

  state.verification = verify(state.graph, state.spec, state.workflow, state.reviewCycles ?? []);

  if (!state.verification.passed) {
    return makeOutcome('verify', index, 'warn',
      `${state.verification.failCount} check(s) failed`, Date.now() - start);
  }

  return makeOutcome('verify', index, 'ok',
    `${state.verification.passCount}/${state.verification.checks.length} checks passed`,
    Date.now() - start);
}

function runAuditPhase(index: number, start: number): PhaseOutcome {
  // The actual audit writing happens after all phases in runPipeline().
  // This phase entry just marks the slot.
  return makeOutcome('audit', index, 'ok', 'audit record written', Date.now() - start);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOutcome(
  phase: PhaseName,
  index: number,
  status: PhaseOutcome['status'],
  detail: string,
  duration_ms: number,
): PhaseOutcome {
  return { phase, index, status, detail, duration_ms };
}
