// ---------------------------------------------------------------------------
// Prodara Templates — Tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  render,
  listTemplates,
  wrapForPlatform,
  renderSpecify,
  renderClarify,
  renderPlan,
  renderImplement,
  renderReview,
  renderFix,
  renderArchitectureReview,
  renderSecurityReview,
  renderCodeQualityReview,
  renderTestQualityReview,
  renderUxQualityReview,
  ARCHITECTURE_PERSPECTIVE,
  SECURITY_PERSPECTIVE,
  CODE_QUALITY_PERSPECTIVE,
  TEST_QUALITY_PERSPECTIVE,
  UX_QUALITY_PERSPECTIVE,
  wrapCopilot,
  wrapClaude,
  wrapCursor,
  wrapOpencode,
  wrapCodex,
  wrapGemini,
  wrapWindsurf,
  wrapKiro,
  wrapJules,
  wrapAmp,
  wrapRoo,
  wrapAider,
  wrapCline,
  wrapContinue,
  wrapZed,
  wrapBolt,
  wrapAide,
  wrapTrae,
  wrapAugment,
  wrapSourcegraph,
  wrapTabnine,
  wrapSupermaven,
  wrapVoid,
  wrapPear,
  wrapDouble,
  wrapGeneric,
  makeAdapter,
  COPILOT_DIR,
  COPILOT_EXT,
  CLAUDE_DIR,
  CLAUDE_EXT,
  CURSOR_DIR,
  CURSOR_EXT,
  OPENCODE_DIR,
  OPENCODE_EXT,
  CODEX_DIR,
  CODEX_EXT,
  GEMINI_DIR,
  GEMINI_EXT,
  WINDSURF_DIR,
  WINDSURF_EXT,
  KIRO_DIR,
  KIRO_EXT,
  JULES_DIR,
  JULES_EXT,
  AMP_DIR,
  AMP_EXT,
  ROO_DIR,
  ROO_EXT,
  AIDER_DIR,
  AIDER_EXT,
  CLINE_DIR,
  CLINE_EXT,
  CONTINUE_DIR,
  CONTINUE_EXT,
  ZED_DIR,
  ZED_EXT,
  BOLT_DIR,
  BOLT_EXT,
  AIDE_DIR,
  AIDE_EXT,
  TRAE_DIR,
  TRAE_EXT,
  AUGMENT_DIR,
  AUGMENT_EXT,
  SOURCEGRAPH_DIR,
  SOURCEGRAPH_EXT,
  TABNINE_DIR,
  TABNINE_EXT,
  SUPERMAVEN_DIR,
  SUPERMAVEN_EXT,
  VOID_DIR,
  VOID_EXT,
  PEAR_DIR,
  PEAR_EXT,
  DOUBLE_DIR,
  DOUBLE_EXT,
  GENERIC_DIR,
  GENERIC_EXT,
  renderCustomReview,
  renderAdversarialReview,
  renderEdgeCaseReview,
  ADVERSARIAL_PERSPECTIVE,
  EDGE_CASE_PERSPECTIVE,
  renderExplore,
  renderHelp,
  renderParty,
  renderDesign,
  renderOnboard,
} from '../src/index.js';
import type {
  SpecifyContext,
  ClarifyContext,
  PlanContext,
  ImplementContext,
  ReviewContext,
  FixContext,
  ExploreContext,
  HelpContext,
  PartyContext,
  DesignContext,
  OnboardContext,
  TemplateId,
  RenderOptions,
} from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basePhaseCtx(): { constitution: string | null; graphSlice: string | null; governance: string | null; artifactRules: readonly string[] | null } {
  return { constitution: null, graphSlice: null, governance: null, artifactRules: null };
}

function specifyCtx(overrides: Partial<SpecifyContext> = {}): SpecifyContext {
  return { ...basePhaseCtx(), moduleName: 'billing', specText: 'entity Invoice { amount: money }', ...overrides };
}

function clarifyCtx(overrides: Partial<ClarifyContext> = {}): ClarifyContext {
  return {
    ...basePhaseCtx(),
    threshold: 'medium',
    questions: [{ id: 'Q1', text: 'What payment provider?', confidence: 'medium', options: ['Stripe', 'PayPal'] }],
    ...overrides,
  };
}

function planCtx(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    ...basePhaseCtx(),
    changes: [{ nodeId: 'billing.entity.invoice', changeKind: 'added' }],
    impacts: [{ nodeId: 'billing.workflow.pay', reason: 'depends on invoice', via: 'reads', depth: 1 }],
    tasks: [{ taskId: 't1', action: 'generate', nodeId: 'billing.entity.invoice', reason: 'new entity' }],
    ...overrides,
  };
}

function implementCtx(overrides: Partial<ImplementContext> = {}): ImplementContext {
  return {
    ...basePhaseCtx(),
    taskId: 't1',
    nodeId: 'billing.entity.invoice',
    module: 'billing',
    action: 'generate',
    nodeKind: 'entity',
    reason: 'New entity added',
    fieldDefinitions: ['amount: money'],
    relatedEdges: ['billing.workflow.pay → reads → billing.entity.invoice'],
    governanceRules: [{ category: 'data', rule: 'All monetary fields must use decimal type' }],
    preserveSeams: false,
    ...overrides,
  };
}

function reviewCtx(overrides: Partial<ReviewContext> = {}): ReviewContext {
  return {
    ...basePhaseCtx(),
    reviewerName: 'test-reviewer',
    perspective: 'Test perspective',
    findings: [{ severity: 'error', category: 'missing_auth', message: 'No auth on write', nodeId: 'billing.workflow.pay' }],
    codeContext: null,
    customPrompt: null,
    ...overrides,
  };
}

function fixCtx(overrides: Partial<FixContext> = {}): FixContext {
  return {
    ...basePhaseCtx(),
    findings: [
      { severity: 'error', category: 'missing_auth', message: 'No auth' },
      { severity: 'warning', category: 'naming', message: 'Bad name' },
      { severity: 'info', category: 'style', message: 'Consider refactoring' },
    ],
    fixSeverity: ['error'],
    ...overrides,
  };
}

function exploreCtx(overrides: Partial<ExploreContext> = {}): ExploreContext {
  return {
    ...basePhaseCtx(),
    topic: 'payment integration',
    modules: ['billing', 'payments'],
    relatedEntities: ['Invoice', 'PaymentMethod'],
    ...overrides,
  };
}

function helpCtx(overrides: Partial<HelpContext> = {}): HelpContext {
  return {
    ...basePhaseCtx(),
    prdFileCount: 3,
    hasBuild: true,
    modules: ['billing', 'auth'],
    recommendations: ['Add workflows to the auth module'],
    ...overrides,
  };
}

function partyCtx(overrides: Partial<PartyContext> = {}): PartyContext {
  return {
    ...basePhaseCtx(),
    topic: 'caching strategy',
    perspectives: [
      { name: 'Architecture', role: 'System architect reviewer' },
      { name: 'Security', role: 'Security auditor' },
    ],
    ...overrides,
  };
}

function designCtx(overrides: Partial<DesignContext> = {}): DesignContext {
  return {
    ...basePhaseCtx(),
    changeName: 'add-billing',
    proposalSummary: 'Add billing module with invoices and payments',
    affectedModules: ['billing', 'core'],
    predictedFileChanges: ['billing.prd', 'core.prd'],
    risks: ['Payment gateway integration complexity'],
    dependencies: ['core module must exist'],
    ...overrides,
  };
}

function onboardCtx(overrides: Partial<OnboardContext> = {}): OnboardContext {
  return {
    ...basePhaseCtx(),
    projectState: 'empty',
    prdFileCount: 0,
    modules: [],
    configuredItems: [],
    missingItems: ['product declaration', 'modules', 'entities'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------

describe('listTemplates', () => {
  it('returns all 18 template IDs', () => {
    const ids = listTemplates();
    expect(ids).toHaveLength(18);
    expect(ids).toContain('phase:specify');
    expect(ids).toContain('phase:clarify');
    expect(ids).toContain('phase:plan');
    expect(ids).toContain('phase:implement');
    expect(ids).toContain('phase:review');
    expect(ids).toContain('phase:fix');
    expect(ids).toContain('phase:explore');
    expect(ids).toContain('phase:help');
    expect(ids).toContain('phase:party');
    expect(ids).toContain('phase:design');
    expect(ids).toContain('phase:onboard');
    expect(ids).toContain('reviewer:architecture');
    expect(ids).toContain('reviewer:security');
    expect(ids).toContain('reviewer:code-quality');
    expect(ids).toContain('reviewer:test-quality');
    expect(ids).toContain('reviewer:ux-quality');
    expect(ids).toContain('reviewer:adversarial');
    expect(ids).toContain('reviewer:edge-case');
  });
});

// ---------------------------------------------------------------------------
// render() central entry
// ---------------------------------------------------------------------------

describe('render', () => {
  it('renders a phase template by ID', () => {
    const out = render('phase:specify', specifyCtx());
    expect(out).toContain('# Specification Analysis: billing');
    expect(out).toContain('entity Invoice');
  });

  it('renders a reviewer template by ID', () => {
    const out = render('reviewer:security', reviewCtx());
    expect(out).toContain('# Security Review');
  });

  it('throws on unknown template ID', () => {
    expect(() => render('phase:unknown' as TemplateId, specifyCtx())).toThrow('Unknown template: phase:unknown');
  });

  it('wraps output for platform when option provided', () => {
    const out = render('phase:specify', specifyCtx(), { platform: 'copilot' });
    expect(out).toContain('---');
    expect(out).toContain('mode: specify');
    expect(out).toContain('# Specification Analysis: billing');
  });

  it('does not wrap when no platform option', () => {
    const out = render('phase:specify', specifyCtx());
    expect(out).not.toContain('mode: specify');
  });

  it('dispatches all phase templates via render()', () => {
    const cases: [TemplateId, SpecifyContext | ClarifyContext | PlanContext | ImplementContext | ReviewContext | FixContext | ExploreContext | HelpContext | PartyContext | DesignContext | OnboardContext, string][] = [
      ['phase:specify', specifyCtx(), '# Specification Analysis'],
      ['phase:clarify', clarifyCtx(), '# Clarification Required'],
      ['phase:plan', planCtx(), '# Execution Plan'],
      ['phase:implement', implementCtx(), '# Implementation Task'],
      ['phase:review', reviewCtx(), '# Code Review'],
      ['phase:fix', fixCtx(), '# Fix Request'],
      ['phase:explore' as TemplateId, exploreCtx(), '# Exploration'],
      ['phase:help' as TemplateId, helpCtx(), '# Prodara Help'],
      ['phase:party' as TemplateId, partyCtx(), '# Party Mode'],
      ['phase:design' as TemplateId, designCtx(), '# Design Document'],
      ['phase:onboard' as TemplateId, onboardCtx(), '# Prodara Onboarding'],
    ];
    for (const [id, ctx, expected] of cases) {
      expect(render(id, ctx)).toContain(expected);
    }
  });

  it('dispatches all reviewer templates via render()', () => {
    const cases: [TemplateId, string][] = [
      ['reviewer:architecture', '# Architecture Review'],
      ['reviewer:security', '# Security Review'],
      ['reviewer:code-quality', '# Code Quality Review'],
      ['reviewer:test-quality', '# Test Quality Review'],
      ['reviewer:ux-quality', '# UX Quality Review'],
      ['reviewer:adversarial' as TemplateId, '# Adversarial Review'],
      ['reviewer:edge-case' as TemplateId, '# Edge Case Review'],
    ];
    for (const [id, expected] of cases) {
      expect(render(id, reviewCtx())).toContain(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase: specify
// ---------------------------------------------------------------------------

describe('renderSpecify', () => {
  it('renders specification analysis header', () => {
    const out = renderSpecify(specifyCtx());
    expect(out).toContain('# Specification Analysis: billing');
    expect(out).toContain('Analyze the following specification');
  });

  it('includes spec text', () => {
    const out = renderSpecify(specifyCtx());
    expect(out).toContain('entity Invoice { amount: money }');
  });

  it('appends constitution when present', () => {
    const out = renderSpecify(specifyCtx({ constitution: 'Use TypeScript' }));
    expect(out).toContain('## Constitution');
    expect(out).toContain('Use TypeScript');
  });

  it('appends graph slice when present', () => {
    const out = renderSpecify(specifyCtx({ graphSlice: '{"nodes":[]}' }));
    expect(out).toContain('## Graph Context');
  });

  it('appends governance when present', () => {
    const out = renderSpecify(specifyCtx({ governance: 'No raw SQL' }));
    expect(out).toContain('## Governance Rules');
    expect(out).toContain('No raw SQL');
  });

  it('omits optional sections when null', () => {
    const out = renderSpecify(specifyCtx());
    expect(out).not.toContain('## Constitution');
    expect(out).not.toContain('## Graph Context');
    expect(out).not.toContain('## Governance Rules');
  });
});

// ---------------------------------------------------------------------------
// Phase: clarify
// ---------------------------------------------------------------------------

describe('renderClarify', () => {
  it('renders clarification header with threshold', () => {
    const out = renderClarify(clarifyCtx());
    expect(out).toContain('# Clarification Required');
    expect(out).toContain('Ambiguity threshold: **medium**');
  });

  it('renders question details', () => {
    const out = renderClarify(clarifyCtx());
    expect(out).toContain('Q1: What payment provider?');
    expect(out).toContain('Confidence: medium');
    expect(out).toContain('- Stripe');
    expect(out).toContain('- PayPal');
  });

  it('handles questions without options', () => {
    const out = renderClarify(clarifyCtx({
      questions: [{ id: 'Q2', text: 'How many users?', confidence: 'low', options: [] }],
    }));
    expect(out).toContain('Q2: How many users?');
    expect(out).not.toContain('Options:');
  });

  it('includes constitution when present', () => {
    const out = renderClarify(clarifyCtx({ constitution: 'Use monorepo' }));
    expect(out).toContain('## Constitution');
  });

  it('includes graph slice when present', () => {
    const out = renderClarify(clarifyCtx({ graphSlice: 'slice data' }));
    expect(out).toContain('## Graph Context');
  });
});

// ---------------------------------------------------------------------------
// Phase: plan
// ---------------------------------------------------------------------------

describe('renderPlan', () => {
  it('renders changes section', () => {
    const out = renderPlan(planCtx());
    expect(out).toContain('## Changes (1)');
    expect(out).toContain('**added** `billing.entity.invoice`');
  });

  it('renders change details when present', () => {
    const out = renderPlan(planCtx({
      changes: [{ nodeId: 'x', changeKind: 'modified', details: 'field added' }],
    }));
    expect(out).toContain('— field added');
  });

  it('renders impacts section', () => {
    const out = renderPlan(planCtx());
    expect(out).toContain('## Impact Analysis (1)');
    expect(out).toContain('depends on invoice');
  });

  it('renders tasks section', () => {
    const out = renderPlan(planCtx());
    expect(out).toContain('## Tasks (1)');
    expect(out).toContain('[t1] **generate**');
  });

  it('omits empty sections', () => {
    const out = renderPlan(planCtx({ changes: [], impacts: [], tasks: [] }));
    expect(out).not.toContain('## Changes');
    expect(out).not.toContain('## Impact');
    expect(out).not.toContain('## Tasks');
  });

  it('includes graph slice when present', () => {
    const out = renderPlan(planCtx({ graphSlice: 'graph data' }));
    expect(out).toContain('## Graph Context');
  });
});

// ---------------------------------------------------------------------------
// Phase: implement
// ---------------------------------------------------------------------------

describe('renderImplement', () => {
  it('renders header with task metadata', () => {
    const out = renderImplement(implementCtx());
    expect(out).toContain('# Implementation Task: t1');
    expect(out).toContain('Action: generate | Node: billing.entity.invoice');
  });

  it('renders context / reason', () => {
    const out = renderImplement(implementCtx());
    expect(out).toContain('New entity added');
  });

  it('renders field definitions', () => {
    const out = renderImplement(implementCtx());
    expect(out).toContain('## Field Definitions');
    expect(out).toContain('- amount: money');
  });

  it('renders related edges', () => {
    const out = renderImplement(implementCtx());
    expect(out).toContain('## Related Edges');
  });

  it('renders governance rules', () => {
    const out = renderImplement(implementCtx());
    expect(out).toContain('## Governance Rules');
    expect(out).toContain('[data] All monetary fields must use decimal type');
  });

  it('includes seam preservation note for regenerate', () => {
    const out = renderImplement(implementCtx({ preserveSeams: true }));
    expect(out).toContain('## Seam Preservation');
    expect(out).toContain('PRODARA SEAM START');
  });

  it('omits seam note when not regenerating', () => {
    const out = renderImplement(implementCtx({ preserveSeams: false }));
    expect(out).not.toContain('## Seam Preservation');
  });

  it('omits empty field definitions', () => {
    const out = renderImplement(implementCtx({ fieldDefinitions: [] }));
    expect(out).not.toContain('## Field Definitions');
  });

  it('omits empty related edges', () => {
    const out = renderImplement(implementCtx({ relatedEdges: [] }));
    expect(out).not.toContain('## Related Edges');
  });

  it('omits empty governance rules', () => {
    const out = renderImplement(implementCtx({ governanceRules: [] }));
    expect(out).not.toContain('## Governance Rules');
  });

  it('includes constitution when present', () => {
    const out = renderImplement(implementCtx({ constitution: 'Constitution text' }));
    expect(out).toContain('## Constitution');
  });

  it('includes graph slice when present', () => {
    const out = renderImplement(implementCtx({ graphSlice: 'graph json' }));
    expect(out).toContain('## Graph Context');
  });

  it('includes governance text when present', () => {
    const out = renderImplement(implementCtx({ governance: 'Gov text' }));
    expect(out).toContain('## Governance');
  });
});

// ---------------------------------------------------------------------------
// Phase: review
// ---------------------------------------------------------------------------

describe('renderReview', () => {
  it('renders header with reviewer name and perspective', () => {
    const out = renderReview(reviewCtx());
    expect(out).toContain('# Code Review: test-reviewer');
    expect(out).toContain('Perspective: Test perspective');
  });

  it('renders findings', () => {
    const out = renderReview(reviewCtx());
    expect(out).toContain('[ERROR] missing_auth');
    expect(out).toContain('No auth on write');
    expect(out).toContain('billing.workflow.pay');
  });

  it('renders suggestion when present', () => {
    const out = renderReview(reviewCtx({
      findings: [{ severity: 'warning', category: 'naming', message: 'Bad name', suggestion: 'Use camelCase' }],
    }));
    expect(out).toContain('**Suggestion:** Use camelCase');
  });

  it('renders finding without nodeId', () => {
    const out = renderReview(reviewCtx({
      findings: [{ severity: 'info', category: 'style', message: 'Consider refactoring' }],
    }));
    expect(out).toContain('[INFO] style');
    expect(out).not.toContain('(undefined)');
  });

  it('omits findings section when empty', () => {
    const out = renderReview(reviewCtx({ findings: [] }));
    expect(out).not.toContain('## Current Findings');
  });

  it('includes code context when present', () => {
    const out = renderReview(reviewCtx({ codeContext: 'function foo() {}' }));
    expect(out).toContain('## Code Context');
    expect(out).toContain('function foo()');
  });

  it('includes constitution when present', () => {
    const out = renderReview(reviewCtx({ constitution: 'TS only' }));
    expect(out).toContain('## Constitution');
  });

  it('includes graph slice when present', () => {
    const out = renderReview(reviewCtx({ graphSlice: 'slice' }));
    expect(out).toContain('## Graph Context');
  });
});

// ---------------------------------------------------------------------------
// Phase: fix
// ---------------------------------------------------------------------------

describe('renderFix', () => {
  it('renders fix request with actionable findings', () => {
    const out = renderFix(fixCtx());
    expect(out).toContain('# Fix Request');
    expect(out).toContain('1 finding(s) require fixes');
    expect(out).toContain('[ERROR] missing_auth');
  });

  it('filters by fix severity', () => {
    const out = renderFix(fixCtx());
    // Only error severity is in fixSeverity
    expect(out).not.toContain('[WARNING]');
    expect(out).not.toContain('[INFO]');
  });

  it('renders no actionable findings message', () => {
    const out = renderFix(fixCtx({ fixSeverity: [] }));
    expect(out).toContain('No actionable findings to fix.');
  });

  it('includes suggestion in fix', () => {
    const out = renderFix(fixCtx({
      findings: [{ severity: 'error', category: 'auth', message: 'Missing', suggestion: 'Add auth edge' }],
      fixSeverity: ['error'],
    }));
    expect(out).toContain('Suggestion: Add auth edge');
  });

  it('includes nodeId in fix', () => {
    const out = renderFix(fixCtx({
      findings: [{ severity: 'error', category: 'auth', message: 'Missing', nodeId: 'mod.wf.pay' }],
      fixSeverity: ['error'],
    }));
    expect(out).toContain('Node: mod.wf.pay');
  });

  it('includes constitution when present', () => {
    const out = renderFix(fixCtx({ constitution: 'TS' }));
    expect(out).toContain('## Constitution');
  });

  it('includes graph slice when present', () => {
    const out = renderFix(fixCtx({ graphSlice: 'data' }));
    expect(out).toContain('## Graph Context');
  });

  it('does not include context when no actionable findings', () => {
    const out = renderFix(fixCtx({ fixSeverity: [], constitution: 'TS' }));
    expect(out).not.toContain('## Constitution');
  });
});

// ---------------------------------------------------------------------------
// Reviewer templates
// ---------------------------------------------------------------------------

describe('reviewer templates', () => {
  it('architecture reviewer renders correct header', () => {
    const out = renderArchitectureReview(reviewCtx({ reviewerName: 'architecture' }));
    expect(out).toContain('# Architecture Review');
    expect(out).toContain(ARCHITECTURE_PERSPECTIVE);
    expect(out).toContain('module boundaries');
  });

  it('security reviewer renders correct header', () => {
    const out = renderSecurityReview(reviewCtx({ reviewerName: 'security' }));
    expect(out).toContain('# Security Review');
    expect(out).toContain(SECURITY_PERSPECTIVE);
    expect(out).toContain('authorization');
  });

  it('code quality reviewer renders correct header', () => {
    const out = renderCodeQualityReview(reviewCtx({ reviewerName: 'code-quality' }));
    expect(out).toContain('# Code Quality Review');
    expect(out).toContain(CODE_QUALITY_PERSPECTIVE);
    expect(out).toContain('naming conventions');
  });

  it('test quality reviewer renders correct header', () => {
    const out = renderTestQualityReview(reviewCtx({ reviewerName: 'test-quality' }));
    expect(out).toContain('# Test Quality Review');
    expect(out).toContain(TEST_QUALITY_PERSPECTIVE);
    expect(out).toContain('test declaration');
  });

  it('ux quality reviewer renders correct header', () => {
    const out = renderUxQualityReview(reviewCtx({ reviewerName: 'ux-quality' }));
    expect(out).toContain('# UX Quality Review');
    expect(out).toContain(UX_QUALITY_PERSPECTIVE);
    expect(out).toContain('accessible labels');
  });

  it('reviewer templates include findings when present', () => {
    const ctx = reviewCtx({ findings: [{ severity: 'error', category: 'test', message: 'fail' }] });
    for (const fn of [renderArchitectureReview, renderSecurityReview, renderCodeQualityReview, renderTestQualityReview, renderUxQualityReview]) {
      const out = fn(ctx);
      expect(out).toContain('Existing Findings (1)');
    }
  });

  it('reviewer templates omit findings section when empty', () => {
    const ctx = reviewCtx({ findings: [] });
    for (const fn of [renderArchitectureReview, renderSecurityReview, renderCodeQualityReview, renderTestQualityReview, renderUxQualityReview]) {
      const out = fn(ctx);
      expect(out).not.toContain('Existing Findings');
    }
  });

  it('reviewer templates include code context', () => {
    const ctx = reviewCtx({ findings: [], codeContext: 'const x = 1;' });
    for (const fn of [renderArchitectureReview, renderSecurityReview, renderCodeQualityReview, renderTestQualityReview, renderUxQualityReview]) {
      const out = fn(ctx);
      expect(out).toContain('## Code Context');
    }
  });

  it('reviewer templates include constitution', () => {
    const ctx = reviewCtx({ findings: [], constitution: 'Rules' });
    for (const fn of [renderArchitectureReview, renderSecurityReview, renderCodeQualityReview, renderTestQualityReview, renderUxQualityReview]) {
      const out = fn(ctx);
      expect(out).toContain('## Constitution');
    }
  });

  it('reviewer templates include graph slice', () => {
    const ctx = reviewCtx({ findings: [], graphSlice: 'graph' });
    for (const fn of [renderArchitectureReview, renderSecurityReview, renderCodeQualityReview, renderTestQualityReview, renderUxQualityReview]) {
      const out = fn(ctx);
      expect(out).toContain('## Graph Context');
    }
  });
});

// ---------------------------------------------------------------------------
// Platform adapters
// ---------------------------------------------------------------------------

describe('platform adapters', () => {
  it('copilot wraps with YAML frontmatter', () => {
    const out = wrapCopilot('content', 'implement');
    expect(out.content).toContain('---\nmode: implement\ntools: []\n---');
    expect(out.content).toContain('content');
    expect(out.suggestedPath).toBe('.github/prompts/prodara-implement.prompt.md');
    expect(out.extension).toBe('.prompt.md');
  });

  it('claude wraps content as-is', () => {
    const out = wrapClaude('content', 'review');
    expect(out.content).toBe('content');
    expect(out.suggestedPath).toBe('.claude/commands/prodara-review.md');
    expect(out.extension).toBe('.md');
  });

  it('cursor wraps with MDC frontmatter', () => {
    const out = wrapCursor('content', 'clarify');
    expect(out.content).toContain('---\ndescription: Prodara clarify phase');
    expect(out.content).toContain('globs: ["**/*.prd"]');
    expect(out.suggestedPath).toBe('.cursor/rules/prodara-clarify.mdc');
    expect(out.extension).toBe('.mdc');
  });

  it('opencode wraps content as-is', () => {
    const out = wrapOpencode('content', 'fix');
    expect(out.content).toBe('content');
    expect(out.suggestedPath).toBe('.opencode/agent/prodara-fix.md');
    expect(out.extension).toBe('.md');
  });

  it('codex wraps content as-is', () => {
    const out = wrapCodex('content', 'plan');
    expect(out.content).toBe('content');
    expect(out.suggestedPath).toBe('.codex/prodara-plan.md');
    expect(out.extension).toBe('.md');
  });

  it('exports correct directory constants', () => {
    expect(COPILOT_DIR).toBe('.github/prompts');
    expect(CLAUDE_DIR).toBe('.claude/commands');
    expect(CURSOR_DIR).toBe('.cursor/rules');
    expect(OPENCODE_DIR).toBe('.opencode/agent');
    expect(CODEX_DIR).toBe('.codex');
    expect(GEMINI_DIR).toBe('.gemini/prompts');
    expect(WINDSURF_DIR).toBe('.windsurf/rules');
    expect(KIRO_DIR).toBe('.kiro/specs');
    expect(JULES_DIR).toBe('.jules/prompts');
    expect(AMP_DIR).toBe('.amp/rules');
    expect(ROO_DIR).toBe('.roo/rules');
    expect(AIDER_DIR).toBe('.aider/prompts');
    expect(CLINE_DIR).toBe('.cline/rules');
    expect(CONTINUE_DIR).toBe('.continue/rules');
    expect(ZED_DIR).toBe('.zed/prompts');
    expect(BOLT_DIR).toBe('.bolt/prompts');
    expect(AIDE_DIR).toBe('.aide/prompts');
    expect(TRAE_DIR).toBe('.trae/rules');
    expect(AUGMENT_DIR).toBe('.augment/prompts');
    expect(SOURCEGRAPH_DIR).toBe('.sourcegraph/prompts');
    expect(TABNINE_DIR).toBe('.tabnine/prompts');
    expect(SUPERMAVEN_DIR).toBe('.supermaven/prompts');
    expect(VOID_DIR).toBe('.void/prompts');
    expect(PEAR_DIR).toBe('.pear/prompts');
    expect(DOUBLE_DIR).toBe('.double/prompts');
    expect(GENERIC_DIR).toBe('.ai/commands');
  });

  it('exports correct extension constants', () => {
    expect(COPILOT_EXT).toBe('.prompt.md');
    expect(CLAUDE_EXT).toBe('.md');
    expect(CURSOR_EXT).toBe('.mdc');
    expect(OPENCODE_EXT).toBe('.md');
    expect(CODEX_EXT).toBe('.md');
    expect(GEMINI_EXT).toBe('.md');
    expect(WINDSURF_EXT).toBe('.md');
    expect(KIRO_EXT).toBe('.md');
    expect(JULES_EXT).toBe('.md');
    expect(AMP_EXT).toBe('.md');
    expect(ROO_EXT).toBe('.md');
    expect(AIDER_EXT).toBe('.md');
    expect(CLINE_EXT).toBe('.md');
    expect(CONTINUE_EXT).toBe('.md');
    expect(ZED_EXT).toBe('.md');
    expect(BOLT_EXT).toBe('.md');
    expect(AIDE_EXT).toBe('.md');
    expect(TRAE_EXT).toBe('.md');
    expect(AUGMENT_EXT).toBe('.md');
    expect(SOURCEGRAPH_EXT).toBe('.md');
    expect(TABNINE_EXT).toBe('.md');
    expect(SUPERMAVEN_EXT).toBe('.md');
    expect(VOID_EXT).toBe('.md');
    expect(PEAR_EXT).toBe('.md');
    expect(DOUBLE_EXT).toBe('.md');
    expect(GENERIC_EXT).toBe('.md');
  });

  it('all registry adapters produce correct pass-through output', () => {
    const adapters: [string, (c: string, cap: string) => { content: string; suggestedPath: string; extension: string }, string][] = [
      ['gemini', wrapGemini, '.gemini/prompts'],
      ['windsurf', wrapWindsurf, '.windsurf/rules'],
      ['kiro', wrapKiro, '.kiro/specs'],
      ['jules', wrapJules, '.jules/prompts'],
      ['amp', wrapAmp, '.amp/rules'],
      ['roo', wrapRoo, '.roo/rules'],
      ['aider', wrapAider, '.aider/prompts'],
      ['cline', wrapCline, '.cline/rules'],
      ['continue', wrapContinue, '.continue/rules'],
      ['zed', wrapZed, '.zed/prompts'],
      ['bolt', wrapBolt, '.bolt/prompts'],
      ['aide', wrapAide, '.aide/prompts'],
      ['trae', wrapTrae, '.trae/rules'],
      ['augment', wrapAugment, '.augment/prompts'],
      ['sourcegraph', wrapSourcegraph, '.sourcegraph/prompts'],
      ['tabnine', wrapTabnine, '.tabnine/prompts'],
      ['supermaven', wrapSupermaven, '.supermaven/prompts'],
      ['void', wrapVoid, '.void/prompts'],
      ['pear', wrapPear, '.pear/prompts'],
      ['double', wrapDouble, '.double/prompts'],
      ['generic', wrapGeneric, '.ai/commands'],
    ];
    for (const [name, wrap, dir] of adapters) {
      const out = wrap('my content', 'build');
      expect(out.content).toBe('my content');
      expect(out.suggestedPath).toBe(`${dir}/prodara-build.md`);
      expect(out.extension).toBe('.md');
    }
  });

  it('makeAdapter creates working adapter from definition', () => {
    const wrap = makeAdapter({ dir: '.custom/dir', ext: '.txt' });
    const out = wrap('hello', 'test');
    expect(out.content).toBe('hello');
    expect(out.suggestedPath).toBe('.custom/dir/prodara-test.txt');
    expect(out.extension).toBe('.txt');
  });
});

// ---------------------------------------------------------------------------
// wrapForPlatform
// ---------------------------------------------------------------------------

describe('wrapForPlatform', () => {
  it('wraps for each platform', () => {
    const platforms = [
      'copilot', 'claude', 'cursor', 'opencode', 'codex',
      'gemini', 'windsurf', 'kiro', 'jules', 'amp', 'roo',
      'aider', 'cline', 'continue', 'zed', 'bolt', 'aide',
      'trae', 'augment', 'sourcegraph', 'tabnine', 'supermaven',
      'void', 'pear', 'double', 'generic',
    ] as const;
    for (const p of platforms) {
      const out = wrapForPlatform('test content', 'implement', p);
      expect(out.content).toContain('test content');
      expect(out.suggestedPath).toContain('prodara-implement');
      expect(out.extension.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Barrel exports
// ---------------------------------------------------------------------------

describe('barrel exports', () => {
  it('exports all expected functions and constants', async () => {
    const mod = await import('../src/index.js');
    // Renderer
    expect(mod.render).toBeDefined();
    expect(mod.listTemplates).toBeDefined();
    expect(mod.wrapForPlatform).toBeDefined();
    // Phases
    expect(mod.renderSpecify).toBeDefined();
    expect(mod.renderClarify).toBeDefined();
    expect(mod.renderPlan).toBeDefined();
    expect(mod.renderImplement).toBeDefined();
    expect(mod.renderReview).toBeDefined();
    expect(mod.renderFix).toBeDefined();
    expect(mod.renderExplore).toBeDefined();
    expect(mod.renderHelp).toBeDefined();
    expect(mod.renderParty).toBeDefined();
    expect(mod.renderDesign).toBeDefined();
    expect(mod.renderOnboard).toBeDefined();
    // Reviewers
    expect(mod.renderArchitectureReview).toBeDefined();
    expect(mod.renderSecurityReview).toBeDefined();
    expect(mod.renderCodeQualityReview).toBeDefined();
    expect(mod.renderTestQualityReview).toBeDefined();
    expect(mod.renderUxQualityReview).toBeDefined();
    expect(mod.ARCHITECTURE_PERSPECTIVE).toBeDefined();
    expect(mod.SECURITY_PERSPECTIVE).toBeDefined();
    expect(mod.CODE_QUALITY_PERSPECTIVE).toBeDefined();
    expect(mod.TEST_QUALITY_PERSPECTIVE).toBeDefined();
    expect(mod.UX_QUALITY_PERSPECTIVE).toBeDefined();
    // Platforms
    expect(mod.wrapCopilot).toBeDefined();
    expect(mod.wrapClaude).toBeDefined();
    expect(mod.wrapCursor).toBeDefined();
    expect(mod.wrapOpencode).toBeDefined();
    expect(mod.wrapCodex).toBeDefined();
    expect(mod.wrapGemini).toBeDefined();
    expect(mod.wrapWindsurf).toBeDefined();
    expect(mod.wrapKiro).toBeDefined();
    expect(mod.wrapJules).toBeDefined();
    expect(mod.wrapAmp).toBeDefined();
    expect(mod.wrapRoo).toBeDefined();
    expect(mod.wrapAider).toBeDefined();
    expect(mod.wrapCline).toBeDefined();
    expect(mod.wrapContinue).toBeDefined();
    expect(mod.wrapZed).toBeDefined();
    expect(mod.wrapBolt).toBeDefined();
    expect(mod.wrapAide).toBeDefined();
    expect(mod.wrapTrae).toBeDefined();
    expect(mod.wrapAugment).toBeDefined();
    expect(mod.wrapSourcegraph).toBeDefined();
    expect(mod.wrapTabnine).toBeDefined();
    expect(mod.wrapSupermaven).toBeDefined();
    expect(mod.wrapVoid).toBeDefined();
    expect(mod.wrapPear).toBeDefined();
    expect(mod.wrapDouble).toBeDefined();
    expect(mod.wrapGeneric).toBeDefined();
    expect(mod.makeAdapter).toBeDefined();
    expect(mod.COPILOT_DIR).toBeDefined();
    expect(mod.CLAUDE_DIR).toBeDefined();
    expect(mod.CURSOR_DIR).toBeDefined();
    expect(mod.OPENCODE_DIR).toBeDefined();
    expect(mod.CODEX_DIR).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Custom reviewer template
// ---------------------------------------------------------------------------

describe('renderCustomReview', () => {
  it('renders custom reviewer with custom prompt', () => {
    const out = renderCustomReview(reviewCtx({
      reviewerName: 'performance',
      perspective: 'Evaluate performance characteristics',
      customPrompt: 'Check for N+1 queries and unbounded loops.',
    }));
    expect(out).toContain('# performance Review');
    expect(out).toContain('Evaluate performance characteristics');
    expect(out).toContain('## Custom Instructions');
    expect(out).toContain('Check for N+1 queries');
  });

  it('renders fallback when no custom prompt', () => {
    const out = renderCustomReview(reviewCtx({
      reviewerName: 'generic',
      perspective: 'General review',
      customPrompt: null,
    }));
    expect(out).toContain('# generic Review');
    expect(out).toContain('Perform a thorough review');
    expect(out).not.toContain('## Custom Instructions');
  });

  it('includes findings from context', () => {
    const out = renderCustomReview(reviewCtx({
      reviewerName: 'perf',
      perspective: 'perf',
      customPrompt: 'Check perf.',
      findings: [{ severity: 'warning', category: 'slow_query', message: 'Slow query detected' }],
    }));
    expect(out).toContain('## Existing Findings');
    expect(out).toContain('slow_query');
  });
});

// ---------------------------------------------------------------------------
// Custom reviewer via dynamic dispatch
// ---------------------------------------------------------------------------

describe('render() dynamic reviewer dispatch', () => {
  it('renders custom reviewer via render() for unknown reviewer ID', () => {
    const out = render('reviewer:performance' as TemplateId, reviewCtx({
      reviewerName: 'performance',
      perspective: 'Latency focus',
      customPrompt: 'Analyze latency.',
    }));
    expect(out).toContain('# performance Review');
    expect(out).toContain('Analyze latency');
  });

  it('still renders built-in reviewers normally', () => {
    const out = render('reviewer:architecture', reviewCtx());
    expect(out).toContain('# Architecture Review');
  });
});

// ---------------------------------------------------------------------------
// Template override via RenderOptions
// ---------------------------------------------------------------------------

describe('render() with templateOverride', () => {
  it('uses override content instead of built-in template', () => {
    const overrideContent = '# My Custom Specify\nCustom spec template.';
    const opts: RenderOptions = { templateOverride: overrideContent };
    const out = render('phase:specify', specifyCtx(), opts);
    expect(out).toBe(overrideContent);
    expect(out).not.toContain('# Specification Analysis');
  });

  it('wraps override content for platform', () => {
    const overrideContent = '# Override';
    const opts: RenderOptions = { templateOverride: overrideContent, platform: 'copilot' };
    const out = render('phase:specify', specifyCtx(), opts);
    expect(out).toContain('# Override');
    expect(out).toContain('---');
  });
});

// ---------------------------------------------------------------------------
// Custom prompt in built-in reviewer context
// ---------------------------------------------------------------------------

describe('customPrompt in built-in reviewer templates', () => {
  it('includes custom instructions in architecture review', () => {
    const out = renderArchitectureReview(reviewCtx({
      customPrompt: 'Also check for hexagonal architecture compliance.',
    }));
    expect(out).toContain('## Custom Instructions');
    expect(out).toContain('hexagonal architecture compliance');
  });

  it('omits custom instructions when null', () => {
    const out = renderArchitectureReview(reviewCtx({ customPrompt: null }));
    expect(out).not.toContain('## Custom Instructions');
  });
});

// ---------------------------------------------------------------------------
// Artifact rules in phase templates
// ---------------------------------------------------------------------------

describe('artifact rules', () => {
  it('appends artifact rules to specify template', () => {
    const out = renderSpecify(specifyCtx({
      artifactRules: ['Must include rationale', 'Must reference existing entities'],
    }));
    expect(out).toContain('## Artifact Rules');
    expect(out).toContain('- Must include rationale');
    expect(out).toContain('- Must reference existing entities');
  });

  it('appends artifact rules to clarify template', () => {
    const out = renderClarify(clarifyCtx({
      artifactRules: ['Questions must be prioritized'],
    }));
    expect(out).toContain('## Artifact Rules');
    expect(out).toContain('Questions must be prioritized');
  });

  it('appends artifact rules to plan template', () => {
    const out = renderPlan(planCtx({
      artifactRules: ['Plan must include rollback strategy'],
    }));
    expect(out).toContain('## Artifact Rules');
  });

  it('appends artifact rules to implement template', () => {
    const out = renderImplement(implementCtx({
      artifactRules: ['Follow DDD patterns'],
    }));
    expect(out).toContain('## Artifact Rules');
    expect(out).toContain('Follow DDD patterns');
  });

  it('appends artifact rules to review template', () => {
    const out = renderReview(reviewCtx({
      artifactRules: ['Review must check coverage'],
    }));
    expect(out).toContain('## Artifact Rules');
  });

  it('appends artifact rules to fix template', () => {
    const out = renderFix(fixCtx({
      artifactRules: ['Fixes must include tests'],
    }));
    expect(out).toContain('## Artifact Rules');
  });

  it('omits artifact rules when null', () => {
    const out = renderSpecify(specifyCtx({ artifactRules: null }));
    expect(out).not.toContain('## Artifact Rules');
  });

  it('omits artifact rules when empty', () => {
    const out = renderSpecify(specifyCtx({ artifactRules: [] }));
    expect(out).not.toContain('## Artifact Rules');
  });
});

// ---------------------------------------------------------------------------
// Adversarial reviewer template
// ---------------------------------------------------------------------------

describe('renderAdversarialReview', () => {
  it('renders header with adversarial perspective', () => {
    const out = renderAdversarialReview(reviewCtx());
    expect(out).toContain('# Adversarial Review');
    expect(out).toContain(ADVERSARIAL_PERSPECTIVE);
  });

  it('includes instructions', () => {
    const out = renderAdversarialReview(reviewCtx());
    expect(out).toContain('## Instructions');
    expect(out).toContain('Challenge every assumption');
  });

  it('includes findings when present', () => {
    const out = renderAdversarialReview(reviewCtx({
      findings: [{ severity: 'warning', category: 'gap', message: 'Missing edge' }],
    }));
    expect(out).toContain('Missing edge');
  });

  it('dispatches from render() by ID', () => {
    const out = render('reviewer:adversarial' as TemplateId, reviewCtx());
    expect(out).toContain('# Adversarial Review');
  });
});

// ---------------------------------------------------------------------------
// Edge case reviewer template
// ---------------------------------------------------------------------------

describe('renderEdgeCaseReview', () => {
  it('renders header with edge case perspective', () => {
    const out = renderEdgeCaseReview(reviewCtx());
    expect(out).toContain('# Edge Case Review');
    expect(out).toContain(EDGE_CASE_PERSPECTIVE);
  });

  it('includes instructions', () => {
    const out = renderEdgeCaseReview(reviewCtx());
    expect(out).toContain('## Instructions');
    expect(out).toContain('decision point');
  });

  it('includes findings when present', () => {
    const out = renderEdgeCaseReview(reviewCtx({
      findings: [{ severity: 'info', category: 'boundary', message: 'Off-by-one risk' }],
    }));
    expect(out).toContain('Off-by-one risk');
  });

  it('dispatches from render() by ID', () => {
    const out = render('reviewer:edge-case' as TemplateId, reviewCtx());
    expect(out).toContain('# Edge Case Review');
  });
});

// ---------------------------------------------------------------------------
// renderExplore
// ---------------------------------------------------------------------------

describe('renderExplore', () => {
  it('renders exploration header with topic', () => {
    const out = renderExplore(exploreCtx());
    expect(out).toContain('# Exploration');
    expect(out).toContain('## Topic: payment integration');
  });

  it('includes relevant modules', () => {
    const out = renderExplore(exploreCtx());
    expect(out).toContain('## Relevant Modules');
    expect(out).toContain('- billing');
    expect(out).toContain('- payments');
  });

  it('includes related entities', () => {
    const out = renderExplore(exploreCtx());
    expect(out).toContain('## Related Entities');
    expect(out).toContain('- Invoice');
    expect(out).toContain('- PaymentMethod');
  });

  it('omits modules section when empty', () => {
    const out = renderExplore(exploreCtx({ modules: [] }));
    expect(out).not.toContain('## Relevant Modules');
  });

  it('omits entities section when empty', () => {
    const out = renderExplore(exploreCtx({ relatedEntities: [] }));
    expect(out).not.toContain('## Related Entities');
  });

  it('includes guidelines', () => {
    const out = renderExplore(exploreCtx());
    expect(out).toContain('## Guidelines');
    expect(out).toContain('read-only investigation');
  });

  it('appends constitution when present', () => {
    const out = renderExplore(exploreCtx({ constitution: 'No external deps' }));
    expect(out).toContain('## Constitution');
    expect(out).toContain('No external deps');
  });

  it('appends graph slice when present', () => {
    const out = renderExplore(exploreCtx({ graphSlice: 'billing → payments' }));
    expect(out).toContain('## Graph Context');
    expect(out).toContain('billing → payments');
  });

  it('appends artifact rules when present', () => {
    const out = renderExplore(exploreCtx({ artifactRules: ['Use markdown'] }));
    expect(out).toContain('Use markdown');
  });

  it('dispatches from render() by ID', () => {
    const out = render('phase:explore' as TemplateId, exploreCtx());
    expect(out).toContain('# Exploration');
  });
});

// ---------------------------------------------------------------------------
// renderHelp
// ---------------------------------------------------------------------------

describe('renderHelp', () => {
  it('renders help header', () => {
    const out = renderHelp(helpCtx());
    expect(out).toContain('# Prodara Help');
  });

  it('shows project state', () => {
    const out = renderHelp(helpCtx());
    expect(out).toContain('.prd files: **3**');
    expect(out).toContain('Build artifacts: **present**');
    expect(out).toContain('billing, auth');
  });

  it('shows no build artifacts when hasBuild is false', () => {
    const out = renderHelp(helpCtx({ hasBuild: false }));
    expect(out).toContain('Build artifacts: **none**');
  });

  it('includes recommendations', () => {
    const out = renderHelp(helpCtx());
    expect(out).toContain('## Recommendations');
    expect(out).toContain('Add workflows to the auth module');
  });

  it('omits recommendations when empty', () => {
    const out = renderHelp(helpCtx({ recommendations: [] }));
    expect(out).not.toContain('## Recommendations');
  });

  it('appends constitution when present', () => {
    const out = renderHelp(helpCtx({ constitution: 'Rules here' }));
    expect(out).toContain('## Constitution');
    expect(out).toContain('Rules here');
  });

  it('appends graph slice when present', () => {
    const out = renderHelp(helpCtx({ graphSlice: 'graph data' }));
    expect(out).toContain('## Graph Context');
    expect(out).toContain('graph data');
  });

  it('dispatches from render() by ID', () => {
    const out = render('phase:help' as TemplateId, helpCtx());
    expect(out).toContain('# Prodara Help');
  });
});

// ---------------------------------------------------------------------------
// renderParty
// ---------------------------------------------------------------------------

describe('renderParty', () => {
  it('renders party mode header with topic', () => {
    const out = renderParty(partyCtx());
    expect(out).toContain('# Party Mode');
    expect(out).toContain('## Topic: caching strategy');
  });

  it('lists perspectives', () => {
    const out = renderParty(partyCtx());
    expect(out).toContain('### Architecture');
    expect(out).toContain('Role: System architect reviewer');
    expect(out).toContain('### Security');
    expect(out).toContain('Role: Security auditor');
  });

  it('includes synthesis section', () => {
    const out = renderParty(partyCtx());
    expect(out).toContain('## Synthesis');
  });

  it('handles empty perspectives', () => {
    const out = renderParty(partyCtx({ perspectives: [] }));
    expect(out).toContain('## Synthesis');
  });

  it('appends constitution when present', () => {
    const out = renderParty(partyCtx({ constitution: 'Be fair' }));
    expect(out).toContain('## Constitution');
    expect(out).toContain('Be fair');
  });

  it('appends graph slice when present', () => {
    const out = renderParty(partyCtx({ graphSlice: 'graph data' }));
    expect(out).toContain('## Graph Context');
    expect(out).toContain('graph data');
  });

  it('dispatches from render() by ID', () => {
    const out = render('phase:party' as TemplateId, partyCtx());
    expect(out).toContain('# Party Mode');
  });
});

// ---------------------------------------------------------------------------
// Phase: design
// ---------------------------------------------------------------------------

describe('renderDesign', () => {
  it('renders design document header with change name', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('# Design Document');
    expect(out).toContain('## Change: add-billing');
  });

  it('includes proposal summary', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('## Proposal Summary');
    expect(out).toContain('Add billing module with invoices and payments');
  });

  it('omits proposal summary when null', () => {
    const out = renderDesign(designCtx({ proposalSummary: null }));
    expect(out).not.toContain('## Proposal Summary');
  });

  it('lists affected modules', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('## Affected Modules');
    expect(out).toContain('- billing');
    expect(out).toContain('- core');
  });

  it('omits affected modules when empty', () => {
    const out = renderDesign(designCtx({ affectedModules: [] }));
    expect(out).not.toContain('## Affected Modules');
  });

  it('lists predicted file changes', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('## Predicted File Changes');
    expect(out).toContain('- billing.prd');
  });

  it('omits predicted file changes when empty', () => {
    const out = renderDesign(designCtx({ predictedFileChanges: [] }));
    expect(out).not.toContain('## Predicted File Changes');
  });

  it('lists risks', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('## Risk Assessment');
    expect(out).toContain('- Payment gateway integration complexity');
  });

  it('omits risks when empty', () => {
    const out = renderDesign(designCtx({ risks: [] }));
    expect(out).not.toContain('## Risk Assessment');
  });

  it('lists dependencies', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('## Dependencies');
    expect(out).toContain('- core module must exist');
  });

  it('omits dependencies when empty', () => {
    const out = renderDesign(designCtx({ dependencies: [] }));
    expect(out).not.toContain('## Dependencies');
  });

  it('includes architecture decisions section', () => {
    const out = renderDesign(designCtx());
    expect(out).toContain('## Architecture Decisions');
  });

  it('appends constitution when present', () => {
    const out = renderDesign(designCtx({ constitution: 'Follow SOLID' }));
    expect(out).toContain('## Constitution');
    expect(out).toContain('Follow SOLID');
  });

  it('appends graph slice when present', () => {
    const out = renderDesign(designCtx({ graphSlice: 'graph data' }));
    expect(out).toContain('## Graph Context');
    expect(out).toContain('graph data');
  });

  it('appends artifact rules when present', () => {
    const out = renderDesign(designCtx({ artifactRules: ['Must include rationale'] }));
    expect(out).toContain('## Artifact Rules');
    expect(out).toContain('- Must include rationale');
  });

  it('dispatches from render() by ID', () => {
    const out = render('phase:design' as TemplateId, designCtx());
    expect(out).toContain('# Design Document');
  });
});

// ---------------------------------------------------------------------------
// Phase: onboard
// ---------------------------------------------------------------------------

describe('renderOnboard', () => {
  it('renders onboarding header', () => {
    const out = renderOnboard(onboardCtx());
    expect(out).toContain('# Prodara Onboarding');
  });

  it('shows getting started for empty project', () => {
    const out = renderOnboard(onboardCtx({ projectState: 'empty' }));
    expect(out).toContain('## Getting Started');
    expect(out).toContain('No `.prd` files found');
  });

  it('shows expanding section for basic project', () => {
    const out = renderOnboard(onboardCtx({
      projectState: 'basic',
      prdFileCount: 2,
      modules: ['auth', 'billing'],
    }));
    expect(out).toContain('## Expanding Your Specification');
    expect(out).toContain('Found 2 .prd file(s) and 2 module(s)');
  });

  it('shows advanced section for complete project', () => {
    const out = renderOnboard(onboardCtx({
      projectState: 'complete',
      prdFileCount: 5,
      modules: ['auth', 'billing', 'core'],
    }));
    expect(out).toContain('## Advanced Configuration');
    expect(out).toContain('5 .prd file(s)');
  });

  it('lists configured items', () => {
    const out = renderOnboard(onboardCtx({
      configuredItems: ['product declaration', 'modules'],
    }));
    expect(out).toContain('## Already Configured');
    expect(out).toContain('- ✓ product declaration');
    expect(out).toContain('- ✓ modules');
  });

  it('omits configured items when empty', () => {
    const out = renderOnboard(onboardCtx({ configuredItems: [] }));
    expect(out).not.toContain('## Already Configured');
  });

  it('lists missing items', () => {
    const out = renderOnboard(onboardCtx());
    expect(out).toContain('## Not Yet Configured');
    expect(out).toContain('- ○ product declaration');
  });

  it('omits missing items when empty', () => {
    const out = renderOnboard(onboardCtx({ missingItems: [] }));
    expect(out).not.toContain('## Not Yet Configured');
  });

  it('appends constitution when present', () => {
    const out = renderOnboard(onboardCtx({ constitution: 'Be consistent' }));
    expect(out).toContain('## Constitution');
    expect(out).toContain('Be consistent');
  });

  it('appends graph slice when present', () => {
    const out = renderOnboard(onboardCtx({ graphSlice: 'graph data' }));
    expect(out).toContain('## Graph Context');
    expect(out).toContain('graph data');
  });

  it('appends artifact rules when present', () => {
    const out = renderOnboard(onboardCtx({ artifactRules: ['Keep it simple'] }));
    expect(out).toContain('## Artifact Rules');
    expect(out).toContain('- Keep it simple');
  });

  it('dispatches from render() by ID', () => {
    const out = render('phase:onboard' as TemplateId, onboardCtx());
    expect(out).toContain('# Prodara Onboarding');
  });
});
