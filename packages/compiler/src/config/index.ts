// ---------------------------------------------------------------------------
// Prodara Compiler — Config Module Barrel
// ---------------------------------------------------------------------------

export {
  loadConfig,
  resolveConfig,
  priorityRank,
  DEFAULT_CONFIG,
  CONFIG_FILENAME,
} from './config.js';

export type {
  ProdaraConfig,
  PhasesConfig,
  PhaseConfig,
  ClarifyConfig,
  ReviewFixConfig,
  ReviewerConfig,
  ReviewersConfig,
  ValidationConfig,
  AgentConfig,
  AuditConfig,
  DocsConfig,
  ResolvedConfig,
  ResolvedPhaseConfig,
  ResolvedClarifyConfig,
  ResolvedReviewFixConfig,
  ResolvedReviewerConfig,
  ResolvedValidationConfig,
  ResolvedAgentConfig,
  ResolvedAuditConfig,
  ResolvedDocsConfig,
  ConfigLoadResult,
  QuestionPriority,
  AmbiguityThreshold,
  FixSeverity,
  AgentPlatform,
  ApiProvider,
  WorkflowSchema,
} from './config.js';
