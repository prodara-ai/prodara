// ---------------------------------------------------------------------------
// Prodara Compiler — Configuration Model
// ---------------------------------------------------------------------------
// Loads and validates `prodara.config.json` from the project root.
// An empty `{}` is always valid — all values have sensible defaults.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionPriority = 'low' | 'medium' | 'high' | 'critical';

const QUESTION_PRIORITIES: readonly QuestionPriority[] = ['low', 'medium', 'high', 'critical'];

export type AmbiguityThreshold = 'low' | 'medium' | 'high';

const AMBIGUITY_THRESHOLDS: readonly AmbiguityThreshold[] = ['low', 'medium', 'high'];

export type FixSeverity = 'critical' | 'error' | 'warning';

const FIX_SEVERITIES: readonly FixSeverity[] = ['critical', 'error', 'warning'];

export type AgentPlatform =
  | 'copilot' | 'claude' | 'cursor' | 'opencode' | 'codex'
  | 'gemini' | 'windsurf' | 'kiro' | 'jules' | 'amp' | 'roo'
  | 'aider' | 'cline' | 'continue' | 'zed' | 'bolt' | 'aide'
  | 'trae' | 'augment' | 'sourcegraph' | 'tabnine' | 'supermaven'
  | 'void' | 'pear' | 'double' | 'generic';

const AGENT_PLATFORMS: readonly AgentPlatform[] = [
  'copilot', 'claude', 'cursor', 'opencode', 'codex',
  'gemini', 'windsurf', 'kiro', 'jules', 'amp', 'roo',
  'aider', 'cline', 'continue', 'zed', 'bolt', 'aide',
  'trae', 'augment', 'sourcegraph', 'tabnine', 'supermaven',
  'void', 'pear', 'double', 'generic',
];

export type ApiProvider = 'openai' | 'anthropic';

const API_PROVIDERS: readonly ApiProvider[] = ['openai', 'anthropic'];

export interface PhaseConfig {
  readonly agent?: string;
  readonly model?: string;
}

export interface ClarifyConfig extends PhaseConfig {
  readonly maxQuestions?: number;
  readonly minimumQuestionPriority?: QuestionPriority;
  readonly ambiguityThreshold?: AmbiguityThreshold;
}

export interface PhasesConfig {
  readonly specify?: PhaseConfig;
  readonly clarify?: ClarifyConfig;
  readonly plan?: PhaseConfig;
  readonly tasks?: PhaseConfig;
  readonly analyze?: PhaseConfig;
  readonly implement?: PhaseConfig;
  readonly review?: PhaseConfig;
  readonly fix?: PhaseConfig;
}

export interface ReviewFixConfig {
  readonly maxIterations?: number;
  readonly fixSeverity?: readonly FixSeverity[];
  readonly parallel?: boolean;
}

export interface ReviewerConfig {
  readonly enabled?: boolean;
  readonly promptPath?: string;
}

export interface ReviewersConfig {
  readonly architecture?: ReviewerConfig;
  readonly security?: ReviewerConfig;
  readonly codeQuality?: ReviewerConfig;
  readonly testQuality?: ReviewerConfig;
  readonly uxQuality?: ReviewerConfig;
  readonly adversarial?: ReviewerConfig;
  readonly edgeCase?: ReviewerConfig;
  readonly [key: string]: ReviewerConfig | undefined;
}

export interface ValidationConfig {
  readonly lint?: string | null;
  readonly typecheck?: string | null;
  readonly test?: string | null;
  readonly build?: string | null;
}

export interface AgentConfig {
  readonly platforms?: readonly AgentPlatform[];
  readonly defaultModel?: string | null;
  readonly apiKey?: string | null;
  readonly provider?: ApiProvider | null;
}

export interface AuditConfig {
  readonly enabled?: boolean;
  readonly path?: string;
}

export interface ConstitutionConfig {
  readonly path?: string;
}

export interface PreReviewConfig {
  readonly enabled?: boolean;
  readonly maxIterations?: number;
  readonly fixSeverity?: readonly FixSeverity[];
}

export interface DocsConfig {
  readonly enabled?: boolean;
  readonly outputDir?: string;
}

export interface TemplateOverridesConfig {
  readonly [templateId: string]: string;
}

/** Custom workflow definition. */
export interface WorkflowSchema {
  readonly phases: readonly string[];
  readonly reviewBefore?: readonly string[];
  readonly reviewAfter?: readonly string[];
}

export interface ProdaraConfig {
  readonly phases?: PhasesConfig;
  readonly reviewFix?: ReviewFixConfig;
  readonly postReview?: ReviewFixConfig;
  readonly preReview?: PreReviewConfig;
  readonly reviewers?: ReviewersConfig;
  readonly validation?: ValidationConfig;
  readonly agent?: AgentConfig;
  readonly audit?: AuditConfig;
  readonly constitution?: ConstitutionConfig;
  readonly docs?: DocsConfig;
  readonly templateOverrides?: TemplateOverridesConfig;
  readonly artifactRules?: Readonly<Record<string, readonly string[]>>;
  readonly workflows?: Readonly<Record<string, WorkflowSchema>>;
}

// ---------------------------------------------------------------------------
// Resolved config — all values present
// ---------------------------------------------------------------------------

export interface ResolvedPhaseConfig {
  readonly agent: string;
  readonly model: string;
}

export interface ResolvedClarifyConfig extends ResolvedPhaseConfig {
  readonly maxQuestions: number;
  readonly minimumQuestionPriority: QuestionPriority;
  readonly ambiguityThreshold: AmbiguityThreshold;
}

export interface ResolvedReviewFixConfig {
  readonly maxIterations: number;
  readonly fixSeverity: readonly FixSeverity[];
  readonly parallel: boolean;
}

export interface ResolvedReviewerConfig {
  readonly enabled: boolean;
  readonly promptPath: string | null;
}

export interface ResolvedValidationConfig {
  readonly lint: string | null;
  readonly typecheck: string | null;
  readonly test: string | null;
  readonly build: string | null;
}

export interface ResolvedAgentConfig {
  readonly platforms: readonly AgentPlatform[];
  readonly defaultModel: string | null;
  readonly apiKey: string | null;
  readonly provider: ApiProvider | null;
}

export interface ResolvedAuditConfig {
  readonly enabled: boolean;
  readonly path: string;
}

export interface ResolvedConstitutionConfig {
  readonly path: string | null;
}

export interface ResolvedPreReviewConfig {
  readonly enabled: boolean;
  readonly maxIterations: number;
  readonly fixSeverity: readonly FixSeverity[];
}

export interface ResolvedDocsConfig {
  readonly enabled: boolean;
  readonly outputDir: string;
}

export interface ResolvedConfig {
  readonly phases: {
    readonly specify: ResolvedPhaseConfig;
    readonly clarify: ResolvedClarifyConfig;
    readonly plan: ResolvedPhaseConfig;
    readonly tasks: ResolvedPhaseConfig;
    readonly analyze: ResolvedPhaseConfig;
    readonly implement: ResolvedPhaseConfig;
    readonly review: ResolvedPhaseConfig;
    readonly fix: ResolvedPhaseConfig;
  };
  readonly reviewFix: ResolvedReviewFixConfig;
  readonly preReview: ResolvedPreReviewConfig;
  readonly reviewers: {
    readonly architecture: ResolvedReviewerConfig;
    readonly security: ResolvedReviewerConfig;
    readonly codeQuality: ResolvedReviewerConfig;
    readonly testQuality: ResolvedReviewerConfig;
    readonly uxQuality: ResolvedReviewerConfig;
    readonly adversarial: ResolvedReviewerConfig;
    readonly edgeCase: ResolvedReviewerConfig;
    readonly [key: string]: ResolvedReviewerConfig | undefined;
  };
  readonly validation: ResolvedValidationConfig;
  readonly agent: ResolvedAgentConfig;
  readonly audit: ResolvedAuditConfig;
  readonly constitution: ResolvedConstitutionConfig;
  readonly docs: ResolvedDocsConfig;
  readonly templateOverrides: Readonly<Record<string, string>>;
  readonly artifactRules: Readonly<Record<string, readonly string[]>>;
  readonly workflows: Readonly<Record<string, WorkflowSchema>>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PHASE: ResolvedPhaseConfig = { agent: 'default', model: 'default' };

const DEFAULT_CLARIFY: ResolvedClarifyConfig = {
  agent: 'default',
  model: 'default',
  maxQuestions: 10,
  minimumQuestionPriority: 'medium',
  ambiguityThreshold: 'medium',
};

const DEFAULT_REVIEW_FIX: ResolvedReviewFixConfig = {
  maxIterations: 3,
  fixSeverity: ['critical', 'error'],
  parallel: true,
};

const DEFAULT_PRE_REVIEW: ResolvedPreReviewConfig = {
  enabled: false,
  maxIterations: 2,
  fixSeverity: ['critical', 'error'],
};

const DEFAULT_REVIEWER: ResolvedReviewerConfig = { enabled: true, promptPath: null };
const DEFAULT_REVIEWER_DISABLED: ResolvedReviewerConfig = { enabled: false, promptPath: null };

const DEFAULT_VALIDATION: ResolvedValidationConfig = {
  lint: null,
  typecheck: null,
  test: null,
  build: null,
};

const DEFAULT_AGENT: ResolvedAgentConfig = {
  platforms: ['copilot'],
  defaultModel: null,
  apiKey: null,
  provider: null,
};

const DEFAULT_AUDIT: ResolvedAuditConfig = {
  enabled: true,
  path: '.prodara/runs/',
};

const DEFAULT_CONSTITUTION: ResolvedConstitutionConfig = {
  path: null,
};

const DEFAULT_DOCS: ResolvedDocsConfig = {
  enabled: true,
  outputDir: 'docs/spec',
};

export const DEFAULT_CONFIG: ResolvedConfig = {
  phases: {
    specify: DEFAULT_PHASE,
    clarify: DEFAULT_CLARIFY,
    plan: DEFAULT_PHASE,
    tasks: DEFAULT_PHASE,
    analyze: DEFAULT_PHASE,
    implement: DEFAULT_PHASE,
    review: DEFAULT_PHASE,
    fix: DEFAULT_PHASE,
  },
  reviewFix: DEFAULT_REVIEW_FIX,
  preReview: DEFAULT_PRE_REVIEW,
  reviewers: {
    architecture: DEFAULT_REVIEWER,
    security: DEFAULT_REVIEWER,
    codeQuality: DEFAULT_REVIEWER,
    testQuality: DEFAULT_REVIEWER,
    uxQuality: DEFAULT_REVIEWER,
    adversarial: DEFAULT_REVIEWER_DISABLED,
    edgeCase: DEFAULT_REVIEWER_DISABLED,
  },
  validation: DEFAULT_VALIDATION,
  agent: DEFAULT_AGENT,
  audit: DEFAULT_AUDIT,
  constitution: DEFAULT_CONSTITUTION,
  docs: DEFAULT_DOCS,
  templateOverrides: {},
  artifactRules: {},
  workflows: {
    default: {
      phases: ['specify', 'clarify', 'plan', 'implement', 'review', 'verify'],
    },
  },
};

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

export const CONFIG_FILENAME = 'prodara.config.json';

export interface ConfigLoadResult {
  readonly config: ResolvedConfig;
  readonly warnings: readonly string[];
}

/**
 * Load `prodara.config.json` from the project root and merge with defaults.
 * Returns the fully resolved config and any warnings (unknown keys, etc.).
 */
export function loadConfig(root: string): ConfigLoadResult {
  const configPath = join(root, CONFIG_FILENAME);
  const warnings: string[] = [];

  if (!existsSync(configPath)) {
    return { config: DEFAULT_CONFIG, warnings: [] };
  }

  let raw: unknown;
  try {
    const content = readFileSync(configPath, 'utf-8');
    raw = JSON.parse(content) as unknown;
  } catch {
    warnings.push(`Failed to parse ${CONFIG_FILENAME}; using defaults`);
    return { config: DEFAULT_CONFIG, warnings };
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    warnings.push(`${CONFIG_FILENAME} must be a JSON object; using defaults`);
    return { config: DEFAULT_CONFIG, warnings };
  }

  const obj = raw as Record<string, unknown>;
  return resolveConfig(obj, warnings);
}

/**
 * Resolve a raw config object into a ResolvedConfig with all defaults applied.
 */
export function resolveConfig(
  obj: Record<string, unknown>,
  warnings: string[] = [],
): ConfigLoadResult {
  const known = new Set(['phases', 'reviewFix', 'postReview', 'preReview', 'reviewers', 'validation', 'agent', 'audit', 'constitution', 'docs', 'templateOverrides', 'artifactRules', 'workflows']);
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) {
      warnings.push(`Unknown config key: "${key}"`);
    }
  }

  const phases = resolvePhases(asObject(obj['phases']), warnings);
  // postReview is a backward-compat alias for reviewFix
  const reviewFixRaw = asObject(obj['reviewFix']) ?? asObject(obj['postReview']);
  const reviewFix = resolveReviewFix(reviewFixRaw, warnings);
  const preReview = resolvePreReview(asObject(obj['preReview']));
  const reviewers = resolveReviewers(asObject(obj['reviewers']), warnings);
  const validation = resolveValidation(asObject(obj['validation']), warnings);
  const agent = resolveAgent(asObject(obj['agent']), warnings);
  const audit = resolveAudit(asObject(obj['audit']), warnings);
  const constitution = resolveConstitution(asObject(obj['constitution']));
  const docs = resolveDocs(asObject(obj['docs']));
  const templateOverrides = resolveTemplateOverrides(asObject(obj['templateOverrides']));
  const artifactRules = resolveArtifactRules(asObject(obj['artifactRules']));
  const workflows = resolveWorkflows(asObject(obj['workflows']), warnings);

  return { config: { phases, reviewFix, preReview, reviewers, validation, agent, audit, constitution, docs, templateOverrides, artifactRules, workflows }, warnings };
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

function resolvePhases(
  raw: Record<string, unknown> | null,
  warnings: string[],
): ResolvedConfig['phases'] {
  if (!raw) return DEFAULT_CONFIG.phases;

  const knownPhases = new Set(['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement', 'review', 'fix']);
  for (const key of Object.keys(raw)) {
    if (!knownPhases.has(key)) {
      warnings.push(`Unknown phase: "${key}"`);
    }
  }

  return {
    specify: resolvePhase(asObject(raw['specify'])),
    clarify: resolveClarify(asObject(raw['clarify']), warnings),
    plan: resolvePhase(asObject(raw['plan'])),
    tasks: resolvePhase(asObject(raw['tasks'])),
    analyze: resolvePhase(asObject(raw['analyze'])),
    implement: resolvePhase(asObject(raw['implement'])),
    review: resolvePhase(asObject(raw['review'])),
    fix: resolvePhase(asObject(raw['fix'])),
  };
}

function resolvePhase(raw: Record<string, unknown> | null): ResolvedPhaseConfig {
  if (!raw) return DEFAULT_PHASE;
  return {
    agent: typeof raw['agent'] === 'string' ? raw['agent'] : DEFAULT_PHASE.agent,
    model: typeof raw['model'] === 'string' ? raw['model'] : DEFAULT_PHASE.model,
  };
}

function resolveClarify(
  raw: Record<string, unknown> | null,
  warnings: string[],
): ResolvedClarifyConfig {
  if (!raw) return DEFAULT_CLARIFY;

  const base = resolvePhase(raw);

  let maxQuestions = DEFAULT_CLARIFY.maxQuestions;
  if (typeof raw['maxQuestions'] === 'number' && Number.isInteger(raw['maxQuestions']) && raw['maxQuestions'] > 0) {
    maxQuestions = raw['maxQuestions'];
  } else if (raw['maxQuestions'] !== undefined) {
    warnings.push('phases.clarify.maxQuestions must be a positive integer');
  }

  let minimumQuestionPriority = DEFAULT_CLARIFY.minimumQuestionPriority;
  if (typeof raw['minimumQuestionPriority'] === 'string') {
    if (isQuestionPriority(raw['minimumQuestionPriority'])) {
      minimumQuestionPriority = raw['minimumQuestionPriority'];
    } else {
      warnings.push(`phases.clarify.minimumQuestionPriority must be one of: ${QUESTION_PRIORITIES.join(', ')}`);
    }
  }

  let ambiguityThreshold = DEFAULT_CLARIFY.ambiguityThreshold;
  if (typeof raw['ambiguityThreshold'] === 'string') {
    if (isAmbiguityThreshold(raw['ambiguityThreshold'])) {
      ambiguityThreshold = raw['ambiguityThreshold'];
    } else {
      warnings.push(`phases.clarify.ambiguityThreshold must be one of: ${AMBIGUITY_THRESHOLDS.join(', ')}`);
    }
  }

  return { ...base, maxQuestions, minimumQuestionPriority, ambiguityThreshold };
}

function resolveReviewFix(
  raw: Record<string, unknown> | null,
  warnings: string[],
): ResolvedReviewFixConfig {
  if (!raw) return DEFAULT_REVIEW_FIX;

  let maxIterations = DEFAULT_REVIEW_FIX.maxIterations;
  if (typeof raw['maxIterations'] === 'number' && Number.isInteger(raw['maxIterations']) && raw['maxIterations'] > 0) {
    maxIterations = raw['maxIterations'];
  }

  let fixSeverity = DEFAULT_REVIEW_FIX.fixSeverity;
  if (Array.isArray(raw['fixSeverity'])) {
    const valid = raw['fixSeverity'].filter((v): v is FixSeverity =>
      typeof v === 'string' && (FIX_SEVERITIES as readonly string[]).includes(v),
    );
    if (valid.length > 0) {
      fixSeverity = valid;
    } else {
      warnings.push(`reviewFix.fixSeverity must contain valid severities: ${FIX_SEVERITIES.join(', ')}`);
    }
  }

  let parallel = DEFAULT_REVIEW_FIX.parallel;
  if (typeof raw['parallel'] === 'boolean') {
    parallel = raw['parallel'];
  }

  return { maxIterations, fixSeverity, parallel };
}

function resolvePreReview(
  raw: Record<string, unknown> | null,
): ResolvedPreReviewConfig {
  if (!raw) return DEFAULT_PRE_REVIEW;

  const enabled = typeof raw['enabled'] === 'boolean' ? raw['enabled'] : DEFAULT_PRE_REVIEW.enabled;

  let maxIterations = DEFAULT_PRE_REVIEW.maxIterations;
  if (typeof raw['maxIterations'] === 'number' && raw['maxIterations'] > 0) {
    maxIterations = Math.floor(raw['maxIterations']);
  }

  let fixSeverity = DEFAULT_PRE_REVIEW.fixSeverity;
  if (Array.isArray(raw['fixSeverity'])) {
    const valid = (raw['fixSeverity'] as unknown[]).filter(
      (s): s is FixSeverity => typeof s === 'string' && ['critical', 'error', 'warning'].includes(s),
    );
    if (valid.length > 0) fixSeverity = valid;
  }

  return { enabled, maxIterations, fixSeverity };
}

function resolveReviewers(
  raw: Record<string, unknown> | null,
  _warnings: string[],
): ResolvedConfig['reviewers'] {
  if (!raw) return DEFAULT_CONFIG.reviewers;

  const builtIn = ['architecture', 'security', 'codeQuality', 'testQuality', 'uxQuality', 'adversarial', 'edgeCase'] as const;
  const result: Record<string, ResolvedReviewerConfig> = {};

  for (const name of builtIn) {
    result[name] = resolveReviewer(asObject(raw[name]));
  }

  // Custom reviewers
  for (const key of Object.keys(raw)) {
    if (!(key in result)) {
      result[key] = resolveReviewer(asObject(raw[key]));
    }
  }

  return result as ResolvedConfig['reviewers'];
}

function resolveReviewer(raw: Record<string, unknown> | null): ResolvedReviewerConfig {
  if (!raw) return DEFAULT_REVIEWER;
  return {
    enabled: typeof raw['enabled'] === 'boolean' ? raw['enabled'] : DEFAULT_REVIEWER.enabled,
    promptPath: typeof raw['promptPath'] === 'string' ? raw['promptPath'] : DEFAULT_REVIEWER.promptPath,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function asObject(val: unknown): Record<string, unknown> | null {
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    return val as Record<string, unknown>;
  }
  return null;
}

function isQuestionPriority(val: string): val is QuestionPriority {
  return (QUESTION_PRIORITIES as readonly string[]).includes(val);
}

function isAmbiguityThreshold(val: string): val is AmbiguityThreshold {
  return (AMBIGUITY_THRESHOLDS as readonly string[]).includes(val);
}

// ---------------------------------------------------------------------------
// New section resolvers
// ---------------------------------------------------------------------------

function resolveValidation(
  raw: Record<string, unknown> | null,
  warnings: string[],
): ResolvedValidationConfig {
  if (!raw) return DEFAULT_VALIDATION;

  const knownKeys = new Set(['lint', 'typecheck', 'test', 'build']);
  for (const key of Object.keys(raw)) {
    if (!knownKeys.has(key)) {
      warnings.push(`Unknown validation key: "${key}"`);
    }
  }

  return {
    lint: resolveCommandString(raw['lint']),
    typecheck: resolveCommandString(raw['typecheck']),
    test: resolveCommandString(raw['test']),
    build: resolveCommandString(raw['build']),
  };
}

function resolveCommandString(val: unknown): string | null {
  if (typeof val === 'string' && val.length > 0) return val;
  return null;
}

function resolveAgent(
  raw: Record<string, unknown> | null,
  warnings: string[],
): ResolvedAgentConfig {
  if (!raw) return DEFAULT_AGENT;

  let platforms = DEFAULT_AGENT.platforms;
  if (Array.isArray(raw['platforms'])) {
    const valid = raw['platforms'].filter((v): v is AgentPlatform =>
      typeof v === 'string' && (AGENT_PLATFORMS as readonly string[]).includes(v),
    );
    if (valid.length > 0) {
      platforms = valid;
    } else {
      warnings.push(`agent.platforms must contain valid platforms: ${AGENT_PLATFORMS.join(', ')}`);
    }
  }

  let defaultModel = DEFAULT_AGENT.defaultModel;
  if (typeof raw['defaultModel'] === 'string') {
    defaultModel = raw['defaultModel'] || null;
  }

  let apiKey = DEFAULT_AGENT.apiKey;
  if (typeof raw['apiKey'] === 'string') {
    apiKey = raw['apiKey'] || null;
  }

  let provider = DEFAULT_AGENT.provider;
  if (typeof raw['provider'] === 'string') {
    if ((API_PROVIDERS as readonly string[]).includes(raw['provider'])) {
      provider = raw['provider'] as ApiProvider;
    } else {
      warnings.push(`agent.provider must be one of: ${API_PROVIDERS.join(', ')}`);
    }
  }

  return { platforms, defaultModel, apiKey, provider };
}

function resolveAudit(
  raw: Record<string, unknown> | null,
  _warnings: string[],
): ResolvedAuditConfig {
  if (!raw) return DEFAULT_AUDIT;

  let enabled = DEFAULT_AUDIT.enabled;
  if (typeof raw['enabled'] === 'boolean') {
    enabled = raw['enabled'];
  }

  let path = DEFAULT_AUDIT.path;
  if (typeof raw['path'] === 'string' && raw['path'].length > 0) {
    path = raw['path'];
  }

  return { enabled, path };
}

function resolveConstitution(
  raw: Record<string, unknown> | null,
): ResolvedConstitutionConfig {
  if (!raw) return DEFAULT_CONSTITUTION;

  let path: string | null = DEFAULT_CONSTITUTION.path;
  if (typeof raw['path'] === 'string' && raw['path'].length > 0) {
    path = raw['path'];
  }

  return { path };
}

function resolveDocs(
  raw: Record<string, unknown> | null,
): ResolvedDocsConfig {
  if (!raw) return DEFAULT_DOCS;

  const enabled = typeof raw['enabled'] === 'boolean' ? raw['enabled'] : DEFAULT_DOCS.enabled;
  const outputDir = typeof raw['outputDir'] === 'string' && raw['outputDir'].length > 0
    ? raw['outputDir']
    : DEFAULT_DOCS.outputDir;

  return { enabled, outputDir };
}

function resolveTemplateOverrides(
  raw: Record<string, unknown> | null,
): Readonly<Record<string, string>> {
  if (!raw) return {};

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'string' && val.length > 0) {
      result[key] = val;
    }
  }
  return result;
}

function resolveArtifactRules(
  raw: Record<string, unknown> | null,
): Readonly<Record<string, readonly string[]>> {
  if (!raw) return {};

  const result: Record<string, readonly string[]> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (Array.isArray(val)) {
      result[key] = val.filter((v): v is string => typeof v === 'string');
    }
  }
  return result;
}

function resolveWorkflows(
  raw: Record<string, unknown> | null,
  warnings: string[],
): Readonly<Record<string, WorkflowSchema>> {
  const defaults = DEFAULT_CONFIG.workflows;
  if (!raw) return defaults;

  const result: Record<string, WorkflowSchema> = { ...defaults };
  for (const [name, val] of Object.entries(raw)) {
    const obj = asObject(val);
    if (!obj || !Array.isArray(obj['phases'])) {
      warnings.push(`Invalid workflow definition: "${name}"`);
      continue;
    }
    const phases = (obj['phases'] as unknown[]).filter((p): p is string => typeof p === 'string');
    const reviewBefore = Array.isArray(obj['reviewBefore'])
      ? (obj['reviewBefore'] as unknown[]).filter((p): p is string => typeof p === 'string')
      : undefined;
    const reviewAfter = Array.isArray(obj['reviewAfter'])
      ? (obj['reviewAfter'] as unknown[]).filter((p): p is string => typeof p === 'string')
      : undefined;
    result[name] = { phases, ...(reviewBefore ? { reviewBefore } : {}), ...(reviewAfter ? { reviewAfter } : {}) };
  }
  return result;
}

/**
 * Return the numeric rank of a priority (higher = more important).
 * Useful for filtering questions at or above a threshold.
 */
export function priorityRank(p: QuestionPriority): number {
  return QUESTION_PRIORITIES.indexOf(p);
}
