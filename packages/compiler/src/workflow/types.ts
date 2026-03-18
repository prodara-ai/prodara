// ---------------------------------------------------------------------------
// Prodara Compiler — Workflow Phase Types
// ---------------------------------------------------------------------------
// Each workflow phase produces a deterministic, structured output from the
// Product Graph and IncrementalSpec. External agents consume these outputs —
// the compiler itself performs no AI or generative work.

import type { QuestionPriority } from '../config/config.js';

// ---------------------------------------------------------------------------
// Phase identifiers
// ---------------------------------------------------------------------------

export const PHASE_KINDS = [
  'specify',
  'clarify',
  'plan',
  'tasks',
  'analyze',
  'implement',
] as const;

export type PhaseKind = (typeof PHASE_KINDS)[number];

// ---------------------------------------------------------------------------
// Phase result envelope
// ---------------------------------------------------------------------------

export interface PhaseResult<T = unknown> {
  readonly phase: PhaseKind;
  readonly ok: boolean;
  readonly data: T;
  readonly warnings: readonly string[];
}

// ---------------------------------------------------------------------------
// Specify phase output — describes what the incremental spec means and what
// areas of the product are affected.
// ---------------------------------------------------------------------------

export interface SpecifyOutput {
  readonly affectedModules: readonly string[];
  readonly addedNodes: readonly SpecifyNodeEntry[];
  readonly removedNodes: readonly SpecifyNodeEntry[];
  readonly modifiedNodes: readonly SpecifyNodeEntry[];
  readonly impactedNodes: readonly SpecifyNodeEntry[];
}

export interface SpecifyNodeEntry {
  readonly nodeId: string;
  readonly nodeKind: string;
  readonly module: string;
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Clarify phase output — questions generated from the spec/graph.
// ---------------------------------------------------------------------------

export interface ClarifyOutput {
  readonly questions: readonly ClarifyQuestion[];
  readonly filteredCount: number;
  readonly totalCount: number;
}

export interface ClarifyQuestion {
  readonly id: string;
  readonly priority: QuestionPriority;
  readonly category: ClarifyCategory;
  readonly nodeId: string | null;
  readonly question: string;
  readonly confidence: ClarifyConfidence;
}

export type ClarifyConfidence = 'low' | 'medium' | 'high';

export interface AutoClarifyResult {
  readonly autoResolved: readonly ResolvedQuestion[];
  readonly needsInput: readonly ClarifyQuestion[];
}

export interface ResolvedQuestion {
  readonly question: ClarifyQuestion;
  readonly answer: string;
  readonly reason: string;
}

export type ClarifyCategory =
  | 'ambiguous_type'
  | 'missing_rule'
  | 'unresolved_import'
  | 'empty_module'
  | 'missing_authorization'
  | 'missing_field'
  | 'missing_action';

// ---------------------------------------------------------------------------
// Plan phase output — structured implementation plan derived from
// the incremental spec tasks.
// ---------------------------------------------------------------------------

export interface PlanOutput {
  readonly steps: readonly PlanStep[];
}

export interface PlanStep {
  readonly stepId: string;
  readonly taskId: string;
  readonly nodeId: string;
  readonly action: string;
  readonly module: string;
  readonly nodeKind: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
}

// ---------------------------------------------------------------------------
// Tasks phase output — ordered, dependency-aware task list.
// ---------------------------------------------------------------------------

export interface TasksOutput {
  readonly orderedTasks: readonly OrderedTask[];
}

export interface OrderedTask {
  readonly taskId: string;
  readonly order: number;
  readonly nodeId: string;
  readonly action: string;
  readonly module: string;
  readonly blocked: boolean;
  readonly blockedBy: readonly string[];
}

// ---------------------------------------------------------------------------
// Analyze phase output — risk and dependency analysis per task.
// ---------------------------------------------------------------------------

export interface AnalyzeOutput {
  readonly analyses: readonly TaskAnalysis[];
}

export interface TaskAnalysis {
  readonly taskId: string;
  readonly nodeId: string;
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly riskFactors: readonly string[];
  readonly dependencyCount: number;
  readonly dependentCount: number;
}

// ---------------------------------------------------------------------------
// Implement phase output — instructions for each task.
// ---------------------------------------------------------------------------

export interface ImplementOutput {
  readonly instructions: readonly ImplementInstruction[];
}

export interface ImplementInstruction {
  readonly taskId: string;
  readonly nodeId: string;
  readonly module: string;
  readonly action: string;
  readonly nodeKind: string;
  readonly context: string;
  readonly relatedEdges: readonly string[];
}
