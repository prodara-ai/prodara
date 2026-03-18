// ---------------------------------------------------------------------------
// Prodara Templates — Platform Adapters Barrel
// ---------------------------------------------------------------------------

export { wrapCopilot, COPILOT_DIR, COPILOT_EXT } from './copilot.js';
export { wrapClaude, CLAUDE_DIR, CLAUDE_EXT } from './claude.js';
export { wrapCursor, CURSOR_DIR, CURSOR_EXT } from './cursor.js';
export { wrapOpencode, OPENCODE_DIR, OPENCODE_EXT } from './opencode.js';
export { wrapCodex, CODEX_DIR, CODEX_EXT } from './codex.js';
export {
  makeAdapter,
  wrapGemini, GEMINI_DIR, GEMINI_EXT,
  wrapWindsurf, WINDSURF_DIR, WINDSURF_EXT,
  wrapKiro, KIRO_DIR, KIRO_EXT,
  wrapJules, JULES_DIR, JULES_EXT,
  wrapAmp, AMP_DIR, AMP_EXT,
  wrapRoo, ROO_DIR, ROO_EXT,
  wrapAider, AIDER_DIR, AIDER_EXT,
  wrapCline, CLINE_DIR, CLINE_EXT,
  wrapContinue, CONTINUE_DIR, CONTINUE_EXT,
  wrapZed, ZED_DIR, ZED_EXT,
  wrapBolt, BOLT_DIR, BOLT_EXT,
  wrapAide, AIDE_DIR, AIDE_EXT,
  wrapTrae, TRAE_DIR, TRAE_EXT,
  wrapAugment, AUGMENT_DIR, AUGMENT_EXT,
  wrapSourcegraph, SOURCEGRAPH_DIR, SOURCEGRAPH_EXT,
  wrapTabnine, TABNINE_DIR, TABNINE_EXT,
  wrapSupermaven, SUPERMAVEN_DIR, SUPERMAVEN_EXT,
  wrapVoid, VOID_DIR, VOID_EXT,
  wrapPear, PEAR_DIR, PEAR_EXT,
  wrapDouble, DOUBLE_DIR, DOUBLE_EXT,
  wrapGeneric, GENERIC_DIR, GENERIC_EXT,
} from './registry.js';
export type { PlatformDef } from './registry.js';
