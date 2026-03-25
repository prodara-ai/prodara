// ---------------------------------------------------------------------------
// Barrel export tests — ensure all index.ts re-export files are covered
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';

describe('Barrel exports', () => {
  it('exports from src/index.ts', async () => {
    const mod = await import('../src/index.js');
    expect(mod.PRIMITIVE_TYPES).toBeDefined();
    expect(mod.DiagnosticBag).toBeDefined();
    expect(mod.Lexer).toBeDefined();
    expect(mod.SourceFile).toBeDefined();
    expect(mod.TokenKind).toBeDefined();
    expect(mod.Parser).toBeDefined();
    expect(mod.bind).toBeDefined();
    expect(mod.resolveSymbolRef).toBeDefined();
    expect(mod.checkTypes).toBeDefined();
    expect(mod.validate).toBeDefined();
    expect(mod.buildGraph).toBeDefined();
    expect(mod.serializeGraph).toBeDefined();
    expect(mod.createPlan).toBeDefined();
    expect(mod.diffGraphs).toBeDefined();
    expect(mod.propagateImpact).toBeDefined();
    expect(mod.runSpecTests).toBeDefined();
    expect(mod.resolveRuntime).toBeDefined();
    expect(mod.sliceGraph).toBeDefined();
    expect(mod.sliceAllCategories).toBeDefined();
    expect(mod.validateGraph).toBeDefined();
    expect(mod.resolveConstitutions).toBeDefined();
    expect(mod.parsePackageRef).toBeDefined();
    expect(mod.createBuildRun).toBeDefined();
    expect(mod.createBuildSummary).toBeDefined();
    expect(mod.formatBuildSummary).toBeDefined();
    expect(mod.readPreviousGraph).toBeDefined();
    expect(mod.writeBuildState).toBeDefined();
    expect(mod.discoverFiles).toBeDefined();
    expect(mod.compile).toBeDefined();
    // New modules
    expect(mod.loadConfig).toBeDefined();
    expect(mod.resolveConfig).toBeDefined();
    expect(mod.priorityRank).toBeDefined();
    expect(mod.CONFIG_FILENAME).toBeDefined();
    expect(mod.DEFAULT_CONFIG).toBeDefined();
    expect(mod.buildIncrementalSpec).toBeDefined();
    expect(mod.serializeIncrementalSpec).toBeDefined();
    expect(mod.runReviewers).toBeDefined();
    expect(mod.runReviewFixLoop).toBeDefined();
    expect(mod.architectureReviewer).toBeDefined();
    expect(mod.qualityReviewer).toBeDefined();
    expect(mod.codeQualityReviewer).toBeDefined();
    expect(mod.specificationReviewer).toBeDefined();
    expect(mod.uxReviewer).toBeDefined();
    expect(mod.securityReviewer).toBeDefined();
    expect(mod.testQualityReviewer).toBeDefined();
    expect(mod.adversarialReviewer).toBeDefined();
    expect(mod.edgeCaseReviewer).toBeDefined();
    expect(mod.DEFAULT_REVIEWERS).toBeDefined();
    expect(mod.loadReviewerPrompt).toBeDefined();
    expect(mod.loadReviewerPrompts).toBeDefined();
    expect(mod.discoverCustomReviewers).toBeDefined();
    expect(mod.loadConstitution).toBeDefined();
    expect(mod.runWorkflow).toBeDefined();
    expect(mod.runClarifyPhase).toBeDefined();
    expect(mod.PHASE_KINDS).toBeDefined();
    expect(mod.verify).toBeDefined();
    expect(mod.generatePromptFile).toBeDefined();
    expect(mod.writePromptFiles).toBeDefined();
    expect(mod.buildPromptContent).toBeDefined();
    expect(mod.searchMarketplace).toBeDefined();
    expect(mod.npmInstall).toBeDefined();
    expect(mod.npmRemove).toBeDefined();
  });

  it('exports from src/binder/index.ts', async () => {
    const mod = await import('../src/binder/index.js');
    expect(mod.bind).toBeDefined();
    expect(mod.resolveSymbolRef).toBeDefined();
  });

  it('exports from src/build-state/index.ts', async () => {
    const mod = await import('../src/build-state/index.js');
    expect(mod.ensureBuildDir).toBeDefined();
    expect(mod.readPreviousGraph).toBeDefined();
    expect(mod.writeBuildState).toBeDefined();
  });

  it('exports from src/checker/index.ts', async () => {
    const mod = await import('../src/checker/index.js');
    expect(mod.checkTypes).toBeDefined();
    expect(mod.validate).toBeDefined();
  });

  it('exports from src/diagnostics/index.ts', async () => {
    const mod = await import('../src/diagnostics/index.js');
    expect(mod.DiagnosticBag).toBeDefined();
    expect(mod.formatDiagnosticsJson).toBeDefined();
    expect(mod.formatDiagnosticsHuman).toBeDefined();
  });

  it('exports from src/discovery/index.ts', async () => {
    const mod = await import('../src/discovery/index.js');
    expect(mod.discoverFiles).toBeDefined();
  });

  it('exports from src/generator/index.ts', async () => {
    const mod = await import('../src/generator/index.js');
    expect(mod.sliceGraph).toBeDefined();
    expect(mod.sliceAllCategories).toBeDefined();
  });

  it('exports from src/graph/index.ts', async () => {
    const mod = await import('../src/graph/index.js');
    expect(mod.buildGraph).toBeDefined();
    expect(mod.serializeGraph).toBeDefined();
    expect(mod.validateGraph).toBeDefined();
  });

  it('exports from src/lexer/index.ts', async () => {
    const mod = await import('../src/lexer/index.js');
    expect(mod.TokenKind).toBeDefined();
    expect(mod.KEYWORDS).toBeDefined();
    expect(mod.SourceFile).toBeDefined();
    expect(mod.Lexer).toBeDefined();
  });

  it('exports from src/parser/index.ts', async () => {
    const mod = await import('../src/parser/index.js');
    expect(mod.Parser).toBeDefined();
  });

  it('exports from src/planner/index.ts', async () => {
    const mod = await import('../src/planner/index.js');
    expect(mod.diffGraphs).toBeDefined();
    expect(mod.propagateImpact).toBeDefined();
    expect(mod.createPlan).toBeDefined();
    expect(mod.createInitialPlan).toBeDefined();
  });

  it('exports from src/runtime/index.ts', async () => {
    const mod = await import('../src/runtime/index.js');
    expect(mod.resolveRuntime).toBeDefined();
  });

  it('exports from src/testing/index.ts', async () => {
    const mod = await import('../src/testing/index.js');
    expect(mod.runSpecTests).toBeDefined();
  });

  it('exports from src/registry/index.ts', async () => {
    const mod = await import('../src/registry/index.js');
    expect(mod.resolveConstitutions).toBeDefined();
    expect(mod.parsePackageRef).toBeDefined();
  });

  it('exports from src/orchestrator/index.ts', async () => {
    const mod = await import('../src/orchestrator/index.js');
    expect(mod.createBuildRun).toBeDefined();
    expect(mod.createBuildSummary).toBeDefined();
    expect(mod.formatBuildSummary).toBeDefined();
  });

  it('exports from src/config/index.ts', async () => {
    const mod = await import('../src/config/index.js');
    expect(mod.loadConfig).toBeDefined();
    expect(mod.resolveConfig).toBeDefined();
    expect(mod.priorityRank).toBeDefined();
    expect(mod.CONFIG_FILENAME).toBeDefined();
    expect(mod.DEFAULT_CONFIG).toBeDefined();
  });

  it('exports from src/incremental/index.ts', async () => {
    const mod = await import('../src/incremental/index.js');
    expect(mod.buildIncrementalSpec).toBeDefined();
    expect(mod.serializeIncrementalSpec).toBeDefined();
  });

  it('exports from src/reviewers/index.ts', async () => {
    const mod = await import('../src/reviewers/index.js');
    expect(mod.runReviewers).toBeDefined();
    expect(mod.runReviewFixLoop).toBeDefined();
    expect(mod.architectureReviewer).toBeDefined();
    expect(mod.qualityReviewer).toBeDefined();
    expect(mod.codeQualityReviewer).toBeDefined();
    expect(mod.specificationReviewer).toBeDefined();
    expect(mod.uxReviewer).toBeDefined();
    expect(mod.securityReviewer).toBeDefined();
    expect(mod.testQualityReviewer).toBeDefined();
    expect(mod.adversarialReviewer).toBeDefined();
    expect(mod.edgeCaseReviewer).toBeDefined();
    expect(mod.DEFAULT_REVIEWERS).toBeDefined();
    expect(mod.loadReviewerPrompt).toBeDefined();
    expect(mod.loadReviewerPrompts).toBeDefined();
    expect(mod.discoverCustomReviewers).toBeDefined();
  });

  it('exports from src/governance/index.ts', async () => {
    const mod = await import('../src/governance/index.js');
    expect(mod.generateGovernanceFiles).toBeDefined();
    expect(mod.readGovernanceRules).toBeDefined();
    expect(mod.loadConstitution).toBeDefined();
  });

  it('exports from src/workflow/index.ts', async () => {
    const mod = await import('../src/workflow/index.js');
    expect(mod.runWorkflow).toBeDefined();
    expect(mod.runSpecifyPhase).toBeDefined();
    expect(mod.runClarifyPhase).toBeDefined();
    expect(mod.runPlanPhase).toBeDefined();
    expect(mod.runTasksPhase).toBeDefined();
    expect(mod.runAnalyzePhase).toBeDefined();
    expect(mod.runImplementPhase).toBeDefined();
    expect(mod.PHASE_KINDS).toBeDefined();
  });

  it('exports from src/verification/index.ts', async () => {
    const mod = await import('../src/verification/index.js');
    expect(mod.verify).toBeDefined();
  });
});
