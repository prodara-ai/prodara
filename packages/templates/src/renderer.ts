// ---------------------------------------------------------------------------
// Prodara Templates — Renderer
// ---------------------------------------------------------------------------
// Central render() function that dispatches to the correct template and
// optionally wraps the output with platform-specific formatting.

import type {
  TemplateId,
  TemplateContext,
  RenderOptions,
  PlatformOutput,
  PlatformTarget,
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
} from './types.js';
import { renderSpecify } from './phases/specify.js';
import { renderClarify } from './phases/clarify.js';
import { renderPlan } from './phases/plan.js';
import { renderImplement } from './phases/implement.js';
import { renderReview } from './phases/review.js';
import { renderFix } from './phases/fix.js';
import { renderExplore } from './phases/explore.js';
import { renderHelp } from './phases/help.js';
import { renderParty } from './phases/party.js';
import { renderDesign } from './phases/design.js';
import { renderOnboard } from './phases/onboard.js';
import { renderArchitectureReview } from './reviewers/architecture.js';
import { renderSecurityReview } from './reviewers/security.js';
import { renderCodeQualityReview } from './reviewers/code-quality.js';
import { renderTestQualityReview } from './reviewers/test-quality.js';
import { renderUxQualityReview } from './reviewers/ux-quality.js';
import { renderCustomReview } from './reviewers/custom.js';
import { renderAdversarialReview } from './reviewers/adversarial.js';
import { renderEdgeCaseReview } from './reviewers/edge-case.js';
import { wrapCopilot } from './platforms/copilot.js';
import { wrapClaude } from './platforms/claude.js';
import { wrapCursor } from './platforms/cursor.js';
import { wrapOpencode } from './platforms/opencode.js';
import { wrapCodex } from './platforms/codex.js';
import {
  wrapGemini, wrapWindsurf, wrapKiro, wrapJules, wrapAmp, wrapRoo,
  wrapAider, wrapCline, wrapContinue, wrapZed, wrapBolt, wrapAide,
  wrapTrae, wrapAugment, wrapSourcegraph, wrapTabnine, wrapSupermaven,
  wrapVoid, wrapPear, wrapDouble, wrapGeneric,
} from './platforms/registry.js';

// ---------------------------------------------------------------------------
// Phase renderers map
// ---------------------------------------------------------------------------

const PHASE_RENDERERS: Record<string, (ctx: TemplateContext) => string> = {
  'phase:specify': (ctx) => renderSpecify(ctx as SpecifyContext),
  'phase:clarify': (ctx) => renderClarify(ctx as ClarifyContext),
  'phase:plan': (ctx) => renderPlan(ctx as PlanContext),
  'phase:implement': (ctx) => renderImplement(ctx as ImplementContext),
  'phase:review': (ctx) => renderReview(ctx as ReviewContext),
  'phase:fix': (ctx) => renderFix(ctx as FixContext),
  'reviewer:architecture': (ctx) => renderArchitectureReview(ctx as ReviewContext),
  'reviewer:security': (ctx) => renderSecurityReview(ctx as ReviewContext),
  'reviewer:code-quality': (ctx) => renderCodeQualityReview(ctx as ReviewContext),
  'reviewer:test-quality': (ctx) => renderTestQualityReview(ctx as ReviewContext),
  'reviewer:ux-quality': (ctx) => renderUxQualityReview(ctx as ReviewContext),
  'reviewer:adversarial': (ctx) => renderAdversarialReview(ctx as ReviewContext),
  'reviewer:edge-case': (ctx) => renderEdgeCaseReview(ctx as ReviewContext),
  'phase:explore': (ctx) => renderExplore(ctx as ExploreContext),
  'phase:help': (ctx) => renderHelp(ctx as HelpContext),
  'phase:party': (ctx) => renderParty(ctx as PartyContext),
  'phase:design': (ctx) => renderDesign(ctx as DesignContext),
  'phase:onboard': (ctx) => renderOnboard(ctx as OnboardContext),
};

// ---------------------------------------------------------------------------
// Platform wrappers map
// ---------------------------------------------------------------------------

const PLATFORM_WRAPPERS: Record<PlatformTarget, (content: string, capability: string) => PlatformOutput> = {
  copilot: wrapCopilot,
  claude: wrapClaude,
  cursor: wrapCursor,
  opencode: wrapOpencode,
  codex: wrapCodex,
  gemini: wrapGemini,
  windsurf: wrapWindsurf,
  kiro: wrapKiro,
  jules: wrapJules,
  amp: wrapAmp,
  roo: wrapRoo,
  aider: wrapAider,
  cline: wrapCline,
  continue: wrapContinue,
  zed: wrapZed,
  bolt: wrapBolt,
  aide: wrapAide,
  trae: wrapTrae,
  augment: wrapAugment,
  sourcegraph: wrapSourcegraph,
  tabnine: wrapTabnine,
  supermaven: wrapSupermaven,
  void: wrapVoid,
  pear: wrapPear,
  double: wrapDouble,
  generic: wrapGeneric,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All registered template IDs (built-in only). */
export function listTemplates(): readonly TemplateId[] {
  return Object.keys(PHASE_RENDERERS) as TemplateId[];
}

/** Render a template by ID. Returns raw markdown string. */
export function render(id: TemplateId, context: TemplateContext, options?: RenderOptions): string {
  // Check for template override (file path provided via options)
  if (options?.templateOverride) {
    const content = options.templateOverride;
    if (options.platform) {
      const capability = id.split(':').pop()!;
      return wrapForPlatform(content, capability, options.platform).content;
    }
    return content;
  }

  let renderer = PHASE_RENDERERS[id];

  // Dynamic dispatch for custom reviewer templates: reviewer:{name}
  if (!renderer && id.startsWith('reviewer:')) {
    renderer = (ctx) => renderCustomReview(ctx as ReviewContext);
  }

  if (!renderer) {
    throw new Error(`Unknown template: ${id}`);
  }
  const content = renderer(context);

  if (options?.platform) {
    const capability = id.split(':').pop()!;
    return wrapForPlatform(content, capability, options.platform).content;
  }

  return content;
}

/** Wrap rendered content for a specific platform. */
export function wrapForPlatform(
  content: string,
  capability: string,
  platform: PlatformTarget,
): PlatformOutput {
  const wrapper = PLATFORM_WRAPPERS[platform];
  return wrapper(content, capability);
}
