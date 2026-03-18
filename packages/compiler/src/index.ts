// ---------------------------------------------------------------------------
// Prodara Compiler — Public API
// ---------------------------------------------------------------------------

// Core types
export type { SourceLocation, TypeExpr, PrimitiveTypeName, NodeKind, EdgeKind, DiagnosticSeverity, DiagnosticPhase, DiagnosticCategory } from './types.js';
export { PRIMITIVE_TYPES, NODE_KINDS, EDGE_KINDS, DIAGNOSTIC_PHASES, DIAGNOSTIC_CATEGORIES } from './types.js';

// Diagnostics
export { DiagnosticBag } from './diagnostics/diagnostic.js';
export type { Diagnostic, RelatedLocation, DiagnosticFix } from './diagnostics/diagnostic.js';
export { formatDiagnosticsJson, formatDiagnosticsHuman } from './diagnostics/reporter.js';

// Lexer
export { Lexer } from './lexer/lexer.js';
export { SourceFile } from './lexer/source.js';
export { TokenKind } from './lexer/tokens.js';
export type { Token } from './lexer/tokens.js';

// Parser
export { Parser } from './parser/parser.js';
export type { AstFile, TopLevelDecl, ModuleDecl, ModuleItem, ProductDecl } from './parser/ast.js';

// Binder
export { bind, resolveSymbolRef } from './binder/binder.js';
export type { Symbol, ModuleSymbolTable, BindResult } from './binder/binder.js';

// Checker
export { checkTypes } from './checker/type-checker.js';
export { validate } from './checker/validator.js';

// Graph
export { buildGraph } from './graph/builder.js';
export { serializeGraph } from './graph/serializer.js';
export type { ProductGraph, GraphEdge, ModuleNode, ProductNode } from './graph/graph-types.js';

// Planner
export { createPlan, createInitialPlan } from './planner/planner.js';
export { diffGraphs } from './planner/differ.js';
export { propagateImpact } from './planner/propagator.js';
export { semanticDiff, formatSemanticDiffHuman } from './planner/semantic-diff.js';
export type { Plan, NodeChange, ImpactEntry, PlanTask } from './planner/plan-types.js';
export type { SemanticDiffEntry, SemanticDiffResult, SemanticDiffSummary } from './planner/semantic-diff.js';

// Testing
export { runSpecTests } from './testing/test-runner.js';
export type { SpecTestResult, SpecTestSuiteResult } from './testing/test-runner.js';

// Runtime
export { resolveRuntime } from './runtime/resolution.js';

// Generator contracts
export { sliceGraph, sliceAllCategories } from './generator/contracts.js';
export type { Generator, GeneratorDescriptor, GeneratedArtifact, GraphSlice, SliceCategory } from './generator/contracts.js';

// Graph validation
export { validateGraph } from './graph/validator.js';
export type { GraphValidationResult } from './graph/validator.js';

// Registry
export { resolveConstitutions, parsePackageRef } from './registry/resolution.js';
export type { ConstitutionResolutionResult, ResolvedPackage, ConstitutionPackageRef } from './registry/resolution.js';

// Orchestrator
export { createBuildRun, createBuildSummary, formatBuildSummary } from './orchestrator/orchestrator.js';
export type { BuildRun, BuildSummary, PhaseSummary, BuildInput, ArtifactEntry, ArtifactManifest, SeamEntry } from './orchestrator/types.js';
export { runPipeline, PIPELINE_PHASES } from './orchestrator/pipeline.js';
export type { PhaseName, PhaseOutcome, PipelineOptions, PipelineResult } from './orchestrator/pipeline.js';

// Build state
export { readPreviousGraph, writeBuildState, acquireLock, releaseLock, cleanupTempFiles } from './build-state/build-state.js';
export type { BuildState, LockInfo } from './build-state/build-state.js';

// Drift detection
export { detectDrift, formatDriftHuman } from './drift/drift.js';
export type { DriftResult, DriftFile, DriftStatus } from './drift/drift.js';

// Discovery
export { discoverFiles } from './discovery/discovery.js';

// Doc generation
export { generateDocs, writeDocs } from './doc-gen/index.js';
export type { DocFile } from './doc-gen/index.js';

// Compile orchestrator
export { compile } from './cli/compile.js';
export type { CompileOptions, CompileResult, StopAfter } from './cli/compile.js';

// Config
export { loadConfig, resolveConfig, priorityRank, CONFIG_FILENAME, DEFAULT_CONFIG } from './config/config.js';
export type {
  ProdaraConfig, PhasesConfig, PhaseConfig, ClarifyConfig,
  ReviewFixConfig, ReviewerConfig, ReviewersConfig,
  ValidationConfig, AgentConfig, AuditConfig,
  ConstitutionConfig, TemplateOverridesConfig, PreReviewConfig,
  ResolvedConfig, ResolvedPhaseConfig, ResolvedClarifyConfig,
  ResolvedReviewFixConfig, ResolvedReviewerConfig,
  ResolvedValidationConfig, ResolvedAgentConfig, ResolvedAuditConfig,
  ResolvedConstitutionConfig, ResolvedPreReviewConfig,
  QuestionPriority, AmbiguityThreshold, FixSeverity, AgentPlatform, ApiProvider,
  ConfigLoadResult, WorkflowSchema,
} from './config/config.js';

// Incremental spec
export { buildIncrementalSpec, serializeIncrementalSpec } from './incremental/incremental-spec.js';
export type { IncrementalSpec, IncrementalSpecSummary, NodeChangeDetail, ImpactDetail } from './incremental/types.js';

// Reviewers
export { runReviewers, runReviewFixLoop, runReviewFixLoopAsync, buildFixPrompt, runFixAttempt } from './reviewers/reviewer.js';
export type { ReviewerAgent, ReviewFixLoopOptions } from './reviewers/reviewer.js';
export type { FindingSeverity, ReviewFinding, ReviewResult, ReviewCycleResult, FixAttemptResult } from './reviewers/types.js';
export { loadReviewerPrompt, loadReviewerPrompts, discoverCustomReviewers } from './reviewers/prompt-loader.js';
export type { CustomReviewerDefinition } from './reviewers/prompt-loader.js';
export { architectureReviewer } from './reviewers/architecture.js';
export { qualityReviewer } from './reviewers/quality.js';
export { codeQualityReviewer } from './reviewers/code-quality.js';
export { specificationReviewer } from './reviewers/specification.js';
export { uxReviewer } from './reviewers/ux.js';
export { securityReviewer } from './reviewers/security.js';
export { testQualityReviewer } from './reviewers/test-quality.js';
export { adversarialReviewer } from './reviewers/adversarial.js';
export { edgeCaseReviewer } from './reviewers/edge-case.js';
export { DEFAULT_REVIEWERS } from './reviewers/index.js';

// Workflow
export { runWorkflow, runSpecifyPhase, runPlanPhase, runTasksPhase, runAnalyzePhase, runImplementPhase } from './workflow/engine.js';
export type { WorkflowResult } from './workflow/engine.js';
export { runClarifyPhase, autoResolveClarifications } from './workflow/clarify.js';
export { PHASE_KINDS } from './workflow/types.js';
export type {
  PhaseKind, PhaseResult, SpecifyOutput, SpecifyNodeEntry,
  ClarifyOutput, ClarifyQuestion, ClarifyCategory, ClarifyConfidence,
  AutoClarifyResult, ResolvedQuestion,
  PlanOutput, PlanStep, TasksOutput, OrderedTask,
  AnalyzeOutput, TaskAnalysis, ImplementOutput, ImplementInstruction,
} from './workflow/types.js';

// Verification
export { verify } from './verification/verify.js';
export type { VerificationSeverity, VerificationCheck, VerificationResult } from './verification/types.js';

// Governance
export { generateGovernanceFiles, readGovernanceRules, loadConstitution } from './governance/governance.js';
export type { GovernanceFile, GovernanceRule, GovernanceContext } from './governance/types.js';

// Agent
export { PromptFileDriver, createDriver } from './agent/agent.js';
export { ApiDriver, createApiDriver, chatCompletion } from './agent/api-client.js';
export type { ApiClientConfig, ChatMessage } from './agent/api-client.js';
export type {
  AgentDriver, AgentRequest, AgentResponse,
  AgentCapability, AgentStatus, AgentContext, AgentMetadata, PromptFileOutput,
} from './agent/types.js';

// Validation
export { runValidation } from './validation/validation.js';
export type { ValidationCommandResult, ValidationResult, ValidationStep, ValidationStatus } from './validation/types.js';

// Audit
export { createAuditRecord, writeAuditRecord, listAuditRecords, AuditRecordBuilder } from './audit/audit.js';
export type { AuditRecord, AuditPhase, AuditPhaseStatus, AuditOutcome, AuditBlocker } from './audit/types.js';

// Implementation phase
export { buildImplementTasks, buildImplementPrompt, executeImplementation, extractSeams, applySeams } from './implement/implement.js';
export type { ImplementTask, ImplementPrompt, ImplementPhaseResult, ImplementTaskResult, SeamRange, ImplementAction } from './implement/types.js';

// Agent setup — slash command generation
export { generateSlashCommands, writeSlashCommands, isValidAgentId, listSupportedAgents, getAgentConfig, SLASH_COMMAND_COUNT } from './cli/agent-setup.js';
export type { AgentId, AgentCommandConfig, SlashCommandFile } from './cli/agent-setup.js';

// Proposal system
export { createProposal, listProposals, applyProposal, archiveProposal, getProposal, CHANGES_DIR, ARCHIVE_DIR } from './proposal/proposal.js';
export type { ChangeStatus, ChangeProposal, ChangeMetadata } from './proposal/types.js';

// Quality checklist
export { generateChecklist, formatChecklistHuman } from './cli/checklist.js';
export type { Checklist, ChecklistItem, ChecklistCategory, ChecklistSummary } from './cli/checklist.js';

// Cross-artifact analysis
export { analyzeGraph, formatAnalysisHuman } from './cli/analyze.js';
export type { AnalysisResult, ConsistencyCheck, ConsistencyKind, CoverageReport, AnalysisOptions } from './cli/analyze.js';

// Extensions
export { ExtensionRegistry } from './extensions/registry.js';
export { loadExtensions, installExtension, removeExtension, listInstalledExtensions, EXTENSIONS_DIR } from './extensions/loader.js';
export type { ExtensionManifest, ExtensionCapability, InstalledExtension } from './extensions/types.js';
export { searchMarketplace, npmInstall, npmRemove } from './extensions/marketplace.js';
export type { MarketplaceEntry, MarketplaceCategory } from './extensions/marketplace.js';

// Presets
export { loadPresets, installPreset, removePreset, mergePresetOverrides, PRESETS_DIR } from './presets/loader.js';
export type { PresetManifest, PresetOverrides, InstalledPreset } from './presets/types.js';

// Party mode
export { runParty, formatPartyHuman, getSlicesForRole } from './agent/party.js';
export type { PartyRole, PartyAgent, PartyConfig, PartyResult, PartyRound, PartyAgentResult } from './agent/party.js';

// Git helpers
export { isGitRepo, hasChanges, autoCommit } from './cli/git.js';

// Notifications
export { sendNotification, buildNotificationMessage } from './cli/notify.js';

// Dashboard
export { collectDashboardData, formatDashboard } from './cli/dashboard.js';
export type { DashboardData } from './cli/dashboard.js';
