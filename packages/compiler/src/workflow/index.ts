// ---------------------------------------------------------------------------
// Prodara Compiler — Workflow (public API)
// ---------------------------------------------------------------------------

export type {
  PhaseKind,
  PhaseResult,
  SpecifyOutput,
  SpecifyNodeEntry,
  ClarifyOutput,
  ClarifyQuestion,
  ClarifyCategory,
  ClarifyConfidence,
  AutoClarifyResult,
  ResolvedQuestion,
  PlanOutput,
  PlanStep,
  TasksOutput,
  OrderedTask,
  AnalyzeOutput,
  TaskAnalysis,
  ImplementOutput,
  ImplementInstruction,
} from './types.js';
export { PHASE_KINDS } from './types.js';
export { runClarifyPhase, autoResolveClarifications } from './clarify.js';
export type { WorkflowResult } from './engine.js';
export {
  runWorkflow,
  runSpecifyPhase,
  runPlanPhase,
  runTasksPhase,
  runAnalyzePhase,
  runImplementPhase,
} from './engine.js';
