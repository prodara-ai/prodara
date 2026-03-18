export { diffGraphs } from './differ.js';
export { propagateImpact } from './propagator.js';
export { createPlan, createInitialPlan } from './planner.js';
export { semanticDiff, formatSemanticDiffHuman } from './semantic-diff.js';
export type { Plan, NodeChange, ImpactEntry, PlanTask, ChangeKind } from './plan-types.js';
export type { SemanticDiffEntry, SemanticDiffResult, SemanticDiffSummary } from './semantic-diff.js';
