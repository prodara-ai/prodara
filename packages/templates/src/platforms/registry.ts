// ---------------------------------------------------------------------------
// Prodara Templates — Platform Adapter Registry
// ---------------------------------------------------------------------------
// Data-driven registry for simple pass-through platform adapters.
// Platforms that need custom frontmatter (copilot, cursor) have their own files.

import type { PlatformOutput } from '../types.js';

export interface PlatformDef {
  readonly dir: string;
  readonly ext: string;
}

/** Create a pass-through adapter from a platform definition. */
export function makeAdapter(def: PlatformDef): (content: string, capability: string) => PlatformOutput {
  return (content: string, capability: string): PlatformOutput => ({
    content,
    suggestedPath: `${def.dir}/prodara-${capability}${def.ext}`,
    extension: def.ext,
  });
}

// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

export const GEMINI_DIR = '.gemini/prompts';
export const GEMINI_EXT = '.md';
export const wrapGemini = makeAdapter({ dir: GEMINI_DIR, ext: GEMINI_EXT });

export const WINDSURF_DIR = '.windsurf/rules';
export const WINDSURF_EXT = '.md';
export const wrapWindsurf = makeAdapter({ dir: WINDSURF_DIR, ext: WINDSURF_EXT });

export const KIRO_DIR = '.kiro/specs';
export const KIRO_EXT = '.md';
export const wrapKiro = makeAdapter({ dir: KIRO_DIR, ext: KIRO_EXT });

export const JULES_DIR = '.jules/prompts';
export const JULES_EXT = '.md';
export const wrapJules = makeAdapter({ dir: JULES_DIR, ext: JULES_EXT });

export const AMP_DIR = '.amp/rules';
export const AMP_EXT = '.md';
export const wrapAmp = makeAdapter({ dir: AMP_DIR, ext: AMP_EXT });

export const ROO_DIR = '.roo/rules';
export const ROO_EXT = '.md';
export const wrapRoo = makeAdapter({ dir: ROO_DIR, ext: ROO_EXT });

export const AIDER_DIR = '.aider/prompts';
export const AIDER_EXT = '.md';
export const wrapAider = makeAdapter({ dir: AIDER_DIR, ext: AIDER_EXT });

export const CLINE_DIR = '.cline/rules';
export const CLINE_EXT = '.md';
export const wrapCline = makeAdapter({ dir: CLINE_DIR, ext: CLINE_EXT });

export const CONTINUE_DIR = '.continue/rules';
export const CONTINUE_EXT = '.md';
export const wrapContinue = makeAdapter({ dir: CONTINUE_DIR, ext: CONTINUE_EXT });

export const ZED_DIR = '.zed/prompts';
export const ZED_EXT = '.md';
export const wrapZed = makeAdapter({ dir: ZED_DIR, ext: ZED_EXT });

export const BOLT_DIR = '.bolt/prompts';
export const BOLT_EXT = '.md';
export const wrapBolt = makeAdapter({ dir: BOLT_DIR, ext: BOLT_EXT });

export const AIDE_DIR = '.aide/prompts';
export const AIDE_EXT = '.md';
export const wrapAide = makeAdapter({ dir: AIDE_DIR, ext: AIDE_EXT });

export const TRAE_DIR = '.trae/rules';
export const TRAE_EXT = '.md';
export const wrapTrae = makeAdapter({ dir: TRAE_DIR, ext: TRAE_EXT });

export const AUGMENT_DIR = '.augment/prompts';
export const AUGMENT_EXT = '.md';
export const wrapAugment = makeAdapter({ dir: AUGMENT_DIR, ext: AUGMENT_EXT });

export const SOURCEGRAPH_DIR = '.sourcegraph/prompts';
export const SOURCEGRAPH_EXT = '.md';
export const wrapSourcegraph = makeAdapter({ dir: SOURCEGRAPH_DIR, ext: SOURCEGRAPH_EXT });

export const TABNINE_DIR = '.tabnine/prompts';
export const TABNINE_EXT = '.md';
export const wrapTabnine = makeAdapter({ dir: TABNINE_DIR, ext: TABNINE_EXT });

export const SUPERMAVEN_DIR = '.supermaven/prompts';
export const SUPERMAVEN_EXT = '.md';
export const wrapSupermaven = makeAdapter({ dir: SUPERMAVEN_DIR, ext: SUPERMAVEN_EXT });

export const VOID_DIR = '.void/prompts';
export const VOID_EXT = '.md';
export const wrapVoid = makeAdapter({ dir: VOID_DIR, ext: VOID_EXT });

export const PEAR_DIR = '.pear/prompts';
export const PEAR_EXT = '.md';
export const wrapPear = makeAdapter({ dir: PEAR_DIR, ext: PEAR_EXT });

export const DOUBLE_DIR = '.double/prompts';
export const DOUBLE_EXT = '.md';
export const wrapDouble = makeAdapter({ dir: DOUBLE_DIR, ext: DOUBLE_EXT });

export const GENERIC_DIR = '.ai/commands';
export const GENERIC_EXT = '.md';
export const wrapGeneric = makeAdapter({ dir: GENERIC_DIR, ext: GENERIC_EXT });
