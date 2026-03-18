// ---------------------------------------------------------------------------
// Prodara Templates — Types
// ---------------------------------------------------------------------------

// Phase template identifiers
export type PhaseId =
  | 'specify'
  | 'clarify'
  | 'plan'
  | 'implement'
  | 'review'
  | 'fix'
  | 'explore'
  | 'help'
  | 'party'
  | 'design'
  | 'onboard';

// Reviewer template identifiers
export type ReviewerId =
  | 'architecture'
  | 'security'
  | 'code-quality'
  | 'test-quality'
  | 'ux-quality'
  | 'adversarial'
  | 'edge-case';

// Combined template identifier
export type TemplateId =
  | `phase:${PhaseId}`
  | `reviewer:${ReviewerId}`;

// Supported AI platforms
export type PlatformTarget =
  | 'copilot'
  | 'claude'
  | 'cursor'
  | 'opencode'
  | 'codex'
  | 'gemini'
  | 'windsurf'
  | 'kiro'
  | 'jules'
  | 'amp'
  | 'roo'
  | 'aider'
  | 'cline'
  | 'continue'
  | 'zed'
  | 'bolt'
  | 'aide'
  | 'trae'
  | 'augment'
  | 'sourcegraph'
  | 'tabnine'
  | 'supermaven'
  | 'void'
  | 'pear'
  | 'double'
  | 'generic';

// Context passed to phase templates
export interface PhaseContext {
  readonly constitution: string | null;
  readonly graphSlice: string | null;
  readonly governance: string | null;
  readonly artifactRules: readonly string[] | null;
}

// Specify phase context
export interface SpecifyContext extends PhaseContext {
  readonly moduleName: string;
  readonly specText: string;
}

// Clarify phase context
export interface ClarifyContext extends PhaseContext {
  readonly questions: readonly ClarifyQuestion[];
  readonly threshold: 'low' | 'medium' | 'high';
}

export interface ClarifyQuestion {
  readonly id: string;
  readonly text: string;
  readonly confidence: 'low' | 'medium' | 'high';
  readonly options: readonly string[];
}

// Plan phase context
export interface PlanContext extends PhaseContext {
  readonly changes: readonly PlanChange[];
  readonly impacts: readonly PlanImpact[];
  readonly tasks: readonly PlanTaskEntry[];
}

export interface PlanChange {
  readonly nodeId: string;
  readonly changeKind: string;
  readonly details?: string;
}

export interface PlanImpact {
  readonly nodeId: string;
  readonly reason: string;
  readonly via: string;
  readonly depth: number;
}

export interface PlanTaskEntry {
  readonly taskId: string;
  readonly action: string;
  readonly nodeId: string;
  readonly reason: string;
}

// Implement phase context
export interface ImplementContext extends PhaseContext {
  readonly taskId: string;
  readonly nodeId: string;
  readonly module: string;
  readonly action: 'generate' | 'regenerate' | 'remove' | 'verify';
  readonly nodeKind: string;
  readonly reason: string;
  readonly fieldDefinitions: readonly string[];
  readonly relatedEdges: readonly string[];
  readonly governanceRules: readonly GovernanceEntry[];
  readonly preserveSeams: boolean;
}

export interface GovernanceEntry {
  readonly category: string;
  readonly rule: string;
}

// Review phase context
export interface ReviewContext extends PhaseContext {
  readonly reviewerName: string;
  readonly perspective: string;
  readonly findings: readonly ReviewFindingEntry[];
  readonly codeContext: string | null;
  readonly customPrompt: string | null;
}

export interface ReviewFindingEntry {
  readonly severity: string;
  readonly category: string;
  readonly message: string;
  readonly nodeId?: string;
  readonly suggestion?: string;
}

// Fix phase context
export interface FixContext extends PhaseContext {
  readonly findings: readonly ReviewFindingEntry[];
  readonly fixSeverity: readonly string[];
}

// Explore phase context
export interface ExploreContext extends PhaseContext {
  readonly topic: string;
  readonly modules: readonly string[];
  readonly relatedEntities: readonly string[];
}

// Help phase context
export interface HelpContext extends PhaseContext {
  readonly prdFileCount: number;
  readonly hasBuild: boolean;
  readonly modules: readonly string[];
  readonly recommendations: readonly string[];
}

// Party phase context
export interface PartyContext extends PhaseContext {
  readonly topic: string;
  readonly perspectives: readonly PartyPerspective[];
}

export interface PartyPerspective {
  readonly name: string;
  readonly role: string;
}

// Design phase context
export interface DesignContext extends PhaseContext {
  readonly changeName: string;
  readonly proposalSummary: string | null;
  readonly affectedModules: readonly string[];
  readonly predictedFileChanges: readonly string[];
  readonly risks: readonly string[];
  readonly dependencies: readonly string[];
}

// Onboard phase context
export interface OnboardContext extends PhaseContext {
  readonly projectState: 'empty' | 'basic' | 'complete';
  readonly prdFileCount: number;
  readonly modules: readonly string[];
  readonly configuredItems: readonly string[];
  readonly missingItems: readonly string[];
}

// Union of all phase contexts
export type TemplateContext =
  | SpecifyContext
  | ClarifyContext
  | PlanContext
  | ImplementContext
  | ReviewContext
  | FixContext
  | ExploreContext
  | HelpContext
  | PartyContext
  | DesignContext
  | OnboardContext;

// Render options
export interface RenderOptions {
  readonly platform?: PlatformTarget;
  readonly templateOverride?: string;
}

// Platform-wrapped output
export interface PlatformOutput {
  readonly content: string;
  readonly suggestedPath: string;
  readonly extension: string;
}

// Template definition (internal)
export interface TemplateDefinition {
  readonly id: TemplateId;
  readonly render: (context: TemplateContext) => string;
}
