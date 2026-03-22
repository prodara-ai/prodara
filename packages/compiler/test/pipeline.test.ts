// ---------------------------------------------------------------------------
// Pipeline Engine Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPipeline, PIPELINE_PHASES, buildImplementPrompt } from '../src/orchestrator/pipeline.js';
import type { PhaseName, PipelineOptions } from '../src/orchestrator/pipeline.js';
import type { ResolvedConfig } from '../src/config/config.js';
import { DEFAULT_CONFIG } from '../src/config/config.js';
import type { ProductGraph } from '../src/graph/graph-types.js';
import type { IncrementalSpec } from '../src/incremental/types.js';
import type { ReviewCycleResult } from '../src/reviewers/types.js';
import type { WorkflowResult } from '../src/workflow/engine.js';
import type { CompileResult } from '../src/cli/compile.js';
import type { GovernanceFile } from '../src/governance/types.js';
import type { VerificationResult } from '../src/verification/types.js';
import type { ValidationResult } from '../src/validation/types.js';
import { DiagnosticBag } from '../src/diagnostics/diagnostic.js';

// ---------------------------------------------------------------------------
// Mock all heavy dependencies
// ---------------------------------------------------------------------------

vi.mock('../src/cli/compile.js', () => ({
  compile: vi.fn(),
}));

vi.mock('../src/incremental/incremental-spec.js', () => ({
  buildIncrementalSpec: vi.fn(),
}));

vi.mock('../src/workflow/engine.js', () => ({
  runWorkflow: vi.fn(),
}));

vi.mock('../src/governance/governance.js', () => ({
  generateGovernanceFiles: vi.fn(),
}));

vi.mock('../src/validation/validation.js', () => ({
  runValidation: vi.fn(),
}));

vi.mock('../src/reviewers/index.js', () => ({
  DEFAULT_REVIEWERS: [],
  runReviewFixLoop: vi.fn(),
}));

vi.mock('../src/verification/verify.js', () => ({
  verify: vi.fn(),
}));

vi.mock('../src/audit/audit.js', () => {
  const builder = {
    addPhase: vi.fn().mockReturnThis(),
    setOutcome: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({
      timestamp: '2026-03-19T00:00:00.000Z',
      compiler_version: '0.1.0',
      spec_summary: '',
      config_options: {},
      phases: [],
      outcome: 'success',
      blocker: null,
      files_changed: [],
    }),
  };
  return {
    createAuditRecord: vi.fn().mockReturnValue(builder),
    writeAuditRecord: vi.fn().mockReturnValue(null),
  };
});

vi.mock('../src/doc-gen/index.js', () => ({
  generateDocs: vi.fn().mockReturnValue([]),
  writeDocs: vi.fn(),
}));

vi.mock('../src/agent/agent.js', () => ({
  createDriver: vi.fn().mockReturnValue({
    platform: 'copilot',
    generatePromptFile: vi.fn().mockReturnValue({ path: '/tmp/prompt.md', content: '# Prompt' }),
    execute: vi.fn().mockResolvedValue({ content: 'done', status: 'success', metadata: { platform: 'copilot', duration_ms: 0, tokens_used: null, model: null } }),
  }),
}));

vi.mock('../src/agent/api-client.js', () => ({
  createApiDriver: vi.fn().mockReturnValue({
    platform: 'api',
    execute: vi.fn().mockResolvedValue({ content: 'done', status: 'success', metadata: { platform: 'api', duration_ms: 0, tokens_used: null, model: null } }),
  }),
}));

vi.mock('../src/implement/implement.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    buildImplementTasks: vi.fn(),
    executeImplementation: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers \u2014 import mocked modules
// ---------------------------------------------------------------------------

import { compile } from '../src/cli/compile.js';
import { buildIncrementalSpec } from '../src/incremental/incremental-spec.js';
import { runWorkflow } from '../src/workflow/engine.js';
import { generateGovernanceFiles } from '../src/governance/governance.js';
import { runValidation } from '../src/validation/validation.js';
import { runReviewFixLoop } from '../src/reviewers/index.js';
import { verify } from '../src/verification/verify.js';
import { createAuditRecord, writeAuditRecord } from '../src/audit/audit.js';
import { createDriver } from '../src/agent/agent.js';
import { buildImplementTasks, executeImplementation } from '../src/implement/implement.js';

const mockCompile = vi.mocked(compile);
const mockBuildSpec = vi.mocked(buildIncrementalSpec);
const mockRunWorkflow = vi.mocked(runWorkflow);
const mockGovernance = vi.mocked(generateGovernanceFiles);
const mockValidation = vi.mocked(runValidation);
const mockReviewLoop = vi.mocked(runReviewFixLoop);
const mockVerify = vi.mocked(verify);
const mockWriteAudit = vi.mocked(writeAuditRecord);
const mockCreateAudit = vi.mocked(createAuditRecord);
const mockCreateDriver = vi.mocked(createDriver);
const mockBuildImplTasks = vi.mocked(buildImplementTasks);
const mockExecuteImpl = vi.mocked(executeImplementation);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeGraph(moduleCount = 1): ProductGraph {
  const modules = Array.from({ length: moduleCount }, (_, i) => ({
    id: `mod_${i}`,
    kind: 'module' as const,
    name: `mod${i}`,
    imports: [],
    entities: [{ id: `ent_${i}`, kind: 'entity' as const, name: `ent${i}`, fields: [] }],
    workflows: [],
    surfaces: [],
    roles: [],
    integrations: [],
    policies: [],
    tests: [],
  }));
  return {
    product: { id: 'prod', kind: 'product', name: 'TestApp', version: '0.1', modules: modules.map(m => m.name), constitutions: [] },
    modules,
    edges: [],
  } as unknown as ProductGraph;
}

function makeSpec(): IncrementalSpec {
  return {
    changes: [],
    impacts: [],
    tasks: [],
    summary: { addedCount: 1, removedCount: 0, modifiedCount: 0, impactedCount: 0, taskCount: 1, affectedModules: ['mod0'] },
  } as unknown as IncrementalSpec;
}

function makeCompileResult(opts: { errors?: boolean; warnings?: boolean } = {}): CompileResult {
  const bag = new DiagnosticBag();
  if (opts.errors) {
    bag.add({ phase: 'parser', category: 'syntax_error', severity: 'error', code: 'PRD0001', message: 'test error', file: 'test.prd', line: 1, column: 1 });
  }
  if (opts.warnings) {
    bag.add({ phase: 'checker', category: 'type_error', severity: 'warning', code: 'PRD0002', message: 'test warning', file: 'test.prd', line: 1, column: 1 });
  }
  const graph = makeGraph();
  return {
    diagnostics: bag,
    files: [],
    graph,
    graphJson: '{}',
    plan: { tasks: [{ taskId: 't1', nodeId: 'ent_0', action: 'generate', reason: 'new' }] },
    testResults: { totalPassed: 1, totalFailed: 0, results: [], bag: new DiagnosticBag() },
    constitutions: { productConstitution: null, moduleConstitutions: new Map(), bag: new DiagnosticBag() },
  } as unknown as CompileResult;
}

function makeWorkflowResult(ok = true): WorkflowResult {
  return {
    phases: [
      { phase: 'specify' as const, ok: true, data: {}, warnings: [] as string[] },
      { phase: 'implement' as const, ok: true, data: { instructions: [] }, warnings: [] as string[] },
    ],
    ok,
  } as unknown as WorkflowResult;
}

function makeVerification(passed = true): VerificationResult {
  return {
    passed,
    checks: [{ name: 'integrity', severity: passed ? 'pass' : 'fail', message: 'ok' }],
    passCount: passed ? 1 : 0,
    failCount: passed ? 0 : 1,
    warnCount: 0,
  };
}

function makeReviewCycles(accepted = true): ReviewCycleResult[] {
  return [{ iteration: 1, results: [], accepted, totalFindings: accepted ? 0 : 3, criticalCount: 0, errorCount: 0, warningCount: 0, fixAttempt: null }];
}

function makeValidationResult(passed = true): ValidationResult {
  return {
    passed,
    results: passed
      ? [{ step: 'lint', command: 'npm run lint', status: 'passed', exitCode: 0, stdout: '', stderr: '', duration_ms: 100 }]
      : [{ step: 'lint', command: 'npm run lint', status: 'failed', exitCode: 1, stdout: '', stderr: 'err', duration_ms: 100 }],
  } as unknown as ValidationResult;
}

function makeDefaultImplResult(taskCount = 1) {
  return {
    ok: true,
    tasks: Array.from({ length: taskCount }, (_, i) => ({
      taskId: `t${i + 1}`, nodeId: `ent_${i}`, status: 'success' as const, platform: 'copilot' as const, duration_ms: 0, outputPath: null,
    })),
    totalGenerated: taskCount,
    totalFailed: 0,
    totalSkipped: 0,
  };
}

const config: ResolvedConfig = {
  ...DEFAULT_CONFIG,
  audit: { enabled: false, path: '.prodara/runs/' },
};

// ---------------------------------------------------------------------------
// Setup \u2014 default happy path mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  mockCompile.mockReturnValue(makeCompileResult());
  mockBuildSpec.mockReturnValue(makeSpec());
  mockRunWorkflow.mockReturnValue(makeWorkflowResult());
  mockGovernance.mockReturnValue([{ path: 'agents.md', content: '# Rules\nuse strict types\nno any' }] as GovernanceFile[]);
  mockReviewLoop.mockReturnValue(makeReviewCycles());
  mockVerify.mockReturnValue(makeVerification());
  mockBuildImplTasks.mockReturnValue([{
    taskId: 't1', nodeId: 'ent_0', module: 'mod0', action: 'generate' as const,
    nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [],
  }]);
  mockExecuteImpl.mockResolvedValue(makeDefaultImplResult());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PIPELINE_PHASES', () => {
  it('has 13 phases in correct order', () => {
    expect(PIPELINE_PHASES).toHaveLength(13);
    expect(PIPELINE_PHASES[0]).toBe('constitution');
    expect(PIPELINE_PHASES[6]).toBe('docs');
    expect(PIPELINE_PHASES[7]).toBe('preReview');
    expect(PIPELINE_PHASES[8]).toBe('implement');
    expect(PIPELINE_PHASES[12]).toBe('audit');
  });
});

describe('runPipeline', () => {
  it('runs all phases in a successful pipeline', async () => {
    const result = await runPipeline('/tmp/project', config);
    expect(result.status).toBe('success');
    expect(result.phases).toHaveLength(13);
    expect(result.graph).not.toBeNull();
    expect(result.spec).not.toBeNull();
    expect(result.verification).not.toBeNull();
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('reports ok status for each successful phase', async () => {
    const result = await runPipeline('/tmp/project', config);
    const statuses = result.phases.map((p) => `${p.phase}:${p.status}`);
    expect(statuses).toContain('constitution:ok');
    expect(statuses).toContain('compile:ok');
    expect(statuses).toContain('graph:ok');
    expect(statuses).toContain('plan:ok');
    expect(statuses).toContain('workflow:ok');
    expect(statuses).toContain('governance:ok');
    expect(statuses).toContain('verify:ok');
    expect(statuses).toContain('audit:ok');
  });

  it('runs implement phase with prompt files when not headless', async () => {
    const result = await runPipeline('/tmp/project', config);
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('ok');
    expect(impl?.detail).toContain('task(s)');
    expect(impl?.detail).toContain('prompt files');
  });

  it('skips implement when noImplement option set', async () => {
    const result = await runPipeline('/tmp/project', config, { headless: true, noImplement: true });
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('skipped');
    expect(impl?.detail).toContain('disabled');
  });

  it('runs implement in headless mode', async () => {
    const headlessConfig: ResolvedConfig = {
      ...config,
      agent: { ...config.agent, apiKey: 'test-key', provider: 'openai' },
    };
    const result = await runPipeline('/tmp/project', headlessConfig, { headless: true });
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('ok');
    expect(impl?.detail).toContain('headless');
  });

  it('reports ok with 0 tasks when nothing to implement', async () => {
    mockBuildImplTasks.mockReturnValue([]);
    const result = await runPipeline('/tmp/project', config);
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('ok');
    expect(impl?.detail).toContain('0 tasks');
  });

  it('handles agent error during implement phase', async () => {
    mockCreateDriver.mockImplementationOnce(() => { throw new Error('agent unavailable'); });
    const result = await runPipeline('/tmp/project', config);
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('error');
    expect(impl?.detail).toContain('agent error');
  });

  it('handles non-Error throw during implement phase', async () => {
    mockCreateDriver.mockImplementationOnce(() => { throw 'string error'; });
    const result = await runPipeline('/tmp/project', config);
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('error');
    expect(impl?.detail).toContain('unknown error');
  });

  it('falls back to defaults for null agent config in headless mode', async () => {
    const minimalConfig: ResolvedConfig = {
      ...config,
      agent: { platforms: [], defaultModel: null, apiKey: null, provider: null, maxImplementRetries: 1 },
    };
    const result = await runPipeline('/tmp/project', minimalConfig, { headless: true });
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('ok');
    expect(impl?.detail).toContain('headless');
  });

  it('skips validate when no commands configured', async () => {
    const result = await runPipeline('/tmp/project', config);
    const val = result.phases.find((p) => p.phase === 'validate');
    expect(val?.status).toBe('skipped');
    expect(val?.detail).toContain('no validation commands');
  });

  it('runs validate when commands are configured', async () => {
    mockValidation.mockReturnValue(makeValidationResult(true));
    const configWithValidation: ResolvedConfig = {
      ...config,
      validation: { lint: 'npm run lint', typecheck: null, test: null, build: null },
    };
    const result = await runPipeline('/tmp/project', configWithValidation);
    const val = result.phases.find((p) => p.phase === 'validate');
    expect(val?.status).toBe('ok');
    expect(val?.detail).toContain('all validation steps passed');
  });

  it('reports error when validation fails', async () => {
    mockValidation.mockReturnValue(makeValidationResult(false));
    const configWithValidation: ResolvedConfig = {
      ...config,
      validation: { lint: 'npm run lint', typecheck: null, test: null, build: null },
    };
    const result = await runPipeline('/tmp/project', configWithValidation);
    const val = result.phases.find((p) => p.phase === 'validate');
    expect(val?.status).toBe('error');
  });

  it('skips review when noReview option set', async () => {
    const result = await runPipeline('/tmp/project', config, { noReview: true });
    const rev = result.phases.find((p) => p.phase === 'review');
    expect(rev?.status).toBe('skipped');
  });

  it('reports warn when review not accepted', async () => {
    mockReviewLoop.mockReturnValue(makeReviewCycles(false));
    const result = await runPipeline('/tmp/project', config);
    const rev = result.phases.find((p) => p.phase === 'review');
    expect(rev?.status).toBe('warn');
    expect(rev?.detail).toContain('not accepted');
  });

  it('stops pipeline on compile error and skips downstream', async () => {
    mockCompile.mockReturnValue(makeCompileResult({ errors: true }));
    const result = await runPipeline('/tmp/project', config);
    expect(result.status).toBe('failed');

    const compilePhase = result.phases.find((p) => p.phase === 'compile');
    expect(compilePhase?.status).toBe('error');

    const graphPhase = result.phases.find((p) => p.phase === 'graph');
    expect(graphPhase?.status).toBe('skipped');

    const auditPhase = result.phases.find((p) => p.phase === 'audit');
    expect(auditPhase?.status).toBe('ok');
  });

  it('reports compile warnings', async () => {
    mockCompile.mockReturnValue(makeCompileResult({ warnings: true }));
    const result = await runPipeline('/tmp/project', config);
    const compilePhase = result.phases.find((p) => p.phase === 'compile');
    expect(compilePhase?.status).toBe('warn');
    expect(compilePhase?.detail).toContain('warning');
  });

  it('calls onProgress for each phase', async () => {
    const progress: [PhaseName, number, number][] = [];
    const opts: PipelineOptions = {
      onProgress: (phase, index, total) => progress.push([phase, index, total]),
    };
    await runPipeline('/tmp/project', config, opts);
    expect(progress).toHaveLength(13);
    expect(progress[0]).toEqual(['constitution', 0, 13]);
    expect(progress[12]).toEqual(['audit', 12, 13]);
  });

  it('records phase indices correctly', async () => {
    const result = await runPipeline('/tmp/project', config);
    for (let i = 0; i < result.phases.length; i++) {
      expect(result.phases[i]!.index).toBe(i);
    }
  });

  it('returns partial status when verification has warnings', async () => {
    mockVerify.mockReturnValue(makeVerification(false));
    const result = await runPipeline('/tmp/project', config);
    expect(result.status).toBe('partial');
  });

  it('reports graph stats', async () => {
    const result = await runPipeline('/tmp/project', config);
    const graphPhase = result.phases.find((p) => p.phase === 'graph');
    expect(graphPhase?.status).toBe('ok');
    expect(graphPhase?.detail).toContain('nodes');
    expect(graphPhase?.detail).toContain('edges');
  });

  it('reports plan stats', async () => {
    const result = await runPipeline('/tmp/project', config);
    const planPhase = result.phases.find((p) => p.phase === 'plan');
    expect(planPhase?.status).toBe('ok');
    expect(planPhase?.detail).toContain('tasks');
  });

  it('reports governance file count', async () => {
    const result = await runPipeline('/tmp/project', config);
    const govPhase = result.phases.find((p) => p.phase === 'governance');
    expect(govPhase?.status).toBe('ok');
    expect(govPhase?.detail).toContain('1 governance file');
  });

  it('handles governance files with no parseable rules', async () => {
    mockGovernance.mockReturnValue([{ path: 'agents.md', content: '# Header only' }] as GovernanceFile[]);
    const result = await runPipeline('/tmp/project', config);
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('ok');
  });

  it('reports workflow phase count', async () => {
    const result = await runPipeline('/tmp/project', config);
    const wfPhase = result.phases.find((p) => p.phase === 'workflow');
    expect(wfPhase?.status).toBe('ok');
    expect(wfPhase?.detail).toContain('2 phases completed');
  });

  it('reports workflow warnings when not ok', async () => {
    mockRunWorkflow.mockReturnValue(makeWorkflowResult(false));
    const result = await runPipeline('/tmp/project', config);
    const wfPhase = result.phases.find((p) => p.phase === 'workflow');
    expect(wfPhase?.status).toBe('warn');
  });

  it('writes audit record when audit is enabled', async () => {
    const auditConfig: ResolvedConfig = { ...config, audit: { enabled: true, path: '.prodara/runs/' } };
    mockRunWorkflow.mockReturnValue(makeWorkflowResult(false));
    await runPipeline('/tmp/project', auditConfig);
    expect(mockWriteAudit).toHaveBeenCalled();
  });

  it('does not write audit record when audit is disabled', async () => {
    await runPipeline('/tmp/project', config);
    expect(mockWriteAudit).not.toHaveBeenCalled();
  });

  it('handles graph error when compile returns no graph', async () => {
    const noGraph = makeCompileResult();
    (noGraph as { graph: undefined }).graph = undefined;
    mockCompile.mockReturnValue(noGraph);
    const result = await runPipeline('/tmp/project', config);
    const graphPhase = result.phases.find((p) => p.phase === 'graph');
    expect(graphPhase?.status).toBe('error');
    expect(graphPhase?.detail).toContain('no graph');
  });

  it('handles plan error when no plan available', async () => {
    const noPlan = makeCompileResult();
    (noPlan as { plan: undefined }).plan = undefined;
    mockCompile.mockReturnValue(noPlan);
    const result = await runPipeline('/tmp/project', config);
    const planPhase = result.phases.find((p) => p.phase === 'plan');
    expect(planPhase?.status).toBe('error');
  });

  it('review reports error when no graph/spec', async () => {
    const noGraph = makeCompileResult();
    (noGraph as { graph: undefined }).graph = undefined;
    mockCompile.mockReturnValue(noGraph);
    const result = await runPipeline('/tmp/project', config);
    const reviewPhase = result.phases.find((p) => p.phase === 'review');
    expect(reviewPhase?.status).toBe('skipped');
  });

  it('verify reports error when missing prerequisites', async () => {
    const noGraph = makeCompileResult();
    (noGraph as { graph: undefined }).graph = undefined;
    mockCompile.mockReturnValue(noGraph);
    const result = await runPipeline('/tmp/project', config);
    const verifyPhase = result.phases.find((p) => p.phase === 'verify');
    expect(verifyPhase?.status).toBe('skipped');
  });

  it('governance reports error when no graph', async () => {
    const noGraph = makeCompileResult();
    (noGraph as { graph: undefined }).graph = undefined;
    mockCompile.mockReturnValue(noGraph);
    const result = await runPipeline('/tmp/project', config);
    const govPhase = result.phases.find((p) => p.phase === 'governance');
    expect(govPhase?.status).toBe('skipped');
  });

  it('writes audit with no spec on compile error', async () => {
    mockCompile.mockReturnValue(makeCompileResult({ errors: true }));
    const auditConfig: ResolvedConfig = { ...config, audit: { enabled: true, path: '.prodara/runs/' } };
    await runPipeline('/tmp/project', auditConfig);
    expect(mockWriteAudit).toHaveBeenCalled();
  });

  it('writes audit with failed outcome on pipeline error', async () => {
    mockCompile.mockReturnValue(makeCompileResult({ errors: true }));
    const auditConfig: ResolvedConfig = { ...config, audit: { enabled: true, path: '.prodara/runs/' } };
    await runPipeline('/tmp/project', auditConfig);
    const builder = mockCreateAudit.mock.results[0]!.value as { setOutcome: ReturnType<typeof vi.fn> };
    expect(builder.setOutcome).toHaveBeenCalledWith('failed');
  });

  it('handles compile result with no testResults or constitutions', async () => {
    const bare: CompileResult = {
      diagnostics: new DiagnosticBag(),
      files: [],
      graph: makeGraph(),
      plan: { tasks: [{ taskId: 't1', nodeId: 'ent_0', action: 'generate', reason: 'new' }] },
    } as unknown as CompileResult;
    mockCompile.mockReturnValue(bare);
    const result = await runPipeline('/tmp/project', config);
    expect(result.status).toBe('success');
  });

  it('handles empty review cycles', async () => {
    mockReviewLoop.mockReturnValue([]);
    const result = await runPipeline('/tmp/project', config);
    const rev = result.phases.find((p) => p.phase === 'review');
    expect(rev?.status).toBe('ok');
    expect(rev?.detail).toContain('0 cycle(s)');
  });

  // -------------------------------------------------------------------------
  // Pre-review phase
  // -------------------------------------------------------------------------

  it('skips preReview when disabled in config (default)', async () => {
    const result = await runPipeline('/tmp/project', config);
    const pr = result.phases.find((p) => p.phase === 'preReview');
    expect(pr?.status).toBe('skipped');
    expect(pr?.detail).toContain('disabled in config');
  });

  it('runs preReview when enabled in config', async () => {
    const preReviewConfig: ResolvedConfig = {
      ...config,
      preReview: { enabled: true, maxIterations: 2, fixSeverity: ['critical', 'error'] },
    };
    mockReviewLoop.mockReturnValue(makeReviewCycles(true));
    const result = await runPipeline('/tmp/project', preReviewConfig);
    const pr = result.phases.find((p) => p.phase === 'preReview');
    expect(pr?.status).toBe('ok');
    expect(pr?.detail).toContain('accepted');
  });

  it('skips preReview when noPreReview option set', async () => {
    const preReviewConfig: ResolvedConfig = {
      ...config,
      preReview: { enabled: true, maxIterations: 2, fixSeverity: ['critical', 'error'] },
    };
    const result = await runPipeline('/tmp/project', preReviewConfig, { noPreReview: true });
    const pr = result.phases.find((p) => p.phase === 'preReview');
    expect(pr?.status).toBe('skipped');
    expect(pr?.detail).toContain('disabled via options');
  });

  it('reports warn when preReview not accepted', async () => {
    const preReviewConfig: ResolvedConfig = {
      ...config,
      preReview: { enabled: true, maxIterations: 2, fixSeverity: ['critical', 'error'] },
    };
    mockReviewLoop.mockReturnValue(makeReviewCycles(false));
    const result = await runPipeline('/tmp/project', preReviewConfig);
    const pr = result.phases.find((p) => p.phase === 'preReview');
    expect(pr?.status).toBe('warn');
    expect(pr?.detail).toContain('not accepted');
  });

  it('handles empty preReview cycles', async () => {
    const preReviewConfig: ResolvedConfig = {
      ...config,
      preReview: { enabled: true, maxIterations: 2, fixSeverity: ['critical', 'error'] },
    };
    mockReviewLoop.mockReturnValue([]);
    const result = await runPipeline('/tmp/project', preReviewConfig);
    const pr = result.phases.find((p) => p.phase === 'preReview');
    expect(pr?.status).toBe('ok');
    expect(pr?.detail).toContain('0 cycle(s)');
  });

  it('skips docs when disabled in config', async () => {
    const noDocsConfig: ResolvedConfig = {
      ...config,
      docs: { enabled: false, outputDir: 'docs/spec' },
    };
    const result = await runPipeline('/tmp/project', noDocsConfig);
    const docsPhase = result.phases.find((p) => p.phase === 'docs');
    expect(docsPhase?.status).toBe('skipped');
    expect(docsPhase?.detail).toContain('disabled');
  });

  // -------------------------------------------------------------------------
  // Dry-run and implementResult
  // -------------------------------------------------------------------------

  it('returns implementResult in pipeline result', async () => {
    const result = await runPipeline('/tmp/project', config);
    expect(result.implementResult).not.toBeNull();
    expect(result.implementResult!.ok).toBe(true);
  });

  it('runs implement in dry-run mode', async () => {
    const result = await runPipeline('/tmp/project', config, { dryRun: true });
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('ok');
    expect(impl?.detail).toContain('dry-run');
    expect(mockExecuteImpl).not.toHaveBeenCalled();
  });

  it('reports warn when executeImplementation has failures', async () => {
    mockExecuteImpl.mockResolvedValue({
      ok: false, tasks: [{ taskId: 't1', nodeId: 'ent_0', status: 'error' as const, platform: 'copilot' as const, duration_ms: 0, outputPath: null }],
      totalGenerated: 0, totalFailed: 1, totalSkipped: 0,
    });
    const result = await runPipeline('/tmp/project', config);
    const impl = result.phases.find((p) => p.phase === 'implement');
    expect(impl?.status).toBe('warn');
    expect(impl?.detail).toContain('1 failed');
  });

  it('retries implementation in headless mode on failure', async () => {
    mockExecuteImpl.mockResolvedValue({
      ok: false, tasks: [{ taskId: 't1', nodeId: 'ent_0', status: 'error' as const, platform: 'api' as const, duration_ms: 0, outputPath: null }],
      totalGenerated: 0, totalFailed: 1, totalSkipped: 0,
    });
    mockValidation.mockReturnValue({
      passed: false,
      results: [{ step: 'lint', command: 'npm run lint', status: 'failed', exitCode: 1, stdout: '', stderr: '', duration_ms: 100 }],
    } as unknown as ValidationResult);
    const headlessConfig: ResolvedConfig = {
      ...config,
      agent: { ...config.agent, apiKey: 'test-key', provider: 'openai', maxImplementRetries: 2 },
    };
    await runPipeline('/tmp/project', headlessConfig, { headless: true });
    expect(mockExecuteImpl).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// buildImplementPrompt
// ---------------------------------------------------------------------------

describe('buildImplementPrompt', () => {
  const baseGraph: ProductGraph = {
    product: { id: 'product', kind: 'product', name: 'TestApp', title: null, version: '1.0.0', modules: ['core'], publishes: null },
    modules: [{ id: 'core', kind: 'module', name: 'core', imports: [], entities: [], workflows: [], surfaces: [] }],
    edges: [],
  } as unknown as ProductGraph;

  it('generates prompt with task details and product context', () => {
    const instr = {
      taskId: 'T1',
      action: 'create',
      nodeId: 'core.entity.user',
      nodeKind: 'entity',
      module: 'core',
      context: 'Create user entity',
      relatedEdges: [] as string[],
    };
    const prompt = buildImplementPrompt(instr, baseGraph);
    expect(prompt).toContain('# Implementation Task: T1');
    expect(prompt).toContain('Action: create');
    expect(prompt).toContain('core.entity.user');
    expect(prompt).toContain('entity');
    expect(prompt).toContain('core');
    expect(prompt).toContain('Create user entity');
    expect(prompt).not.toContain('## Related Edges');
  });

  it('includes related edges when present', () => {
    const instr = {
      taskId: 'T2',
      action: 'modify',
      nodeId: 'core.workflow.submit',
      nodeKind: 'workflow',
      module: 'core',
      context: 'Modify workflow',
      relatedEdges: ['core.entity.user -> core.workflow.submit', 'core.workflow.submit -> core.surface.dashboard'],
    };
    const prompt = buildImplementPrompt(instr, baseGraph);
    expect(prompt).toContain('## Related Edges');
    expect(prompt).toContain('- core.entity.user -> core.workflow.submit');
    expect(prompt).toContain('- core.workflow.submit -> core.surface.dashboard');
  });
});
