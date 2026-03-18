// ---------------------------------------------------------------------------
// Prodara Compiler — Workflow Phase Engine
// ---------------------------------------------------------------------------
// Deterministic phase orchestrator. Each phase analyzes the Product Graph
// and IncrementalSpec to produce structured data that external agents consume.
// No AI or generative work is performed — all outputs are rule-based.

import type { ProductGraph, ModuleNode } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { ChangeKind } from '../planner/plan-types.js';
import type { ResolvedConfig } from '../config/config.js';
import type {
  PhaseResult,
  SpecifyOutput,
  SpecifyNodeEntry,
  PlanOutput,
  PlanStep,
  TasksOutput,
  OrderedTask,
  AnalyzeOutput,
  TaskAnalysis,
  ImplementOutput,
  ImplementInstruction,
} from './types.js';
import { runClarifyPhase } from './clarify.js';

// ---------------------------------------------------------------------------
// Full workflow execution
// ---------------------------------------------------------------------------

export interface WorkflowResult {
  readonly phases: readonly PhaseResult[];
  readonly ok: boolean;
}

/**
 * Run all workflow phases in sequence, producing structured outputs for
 * each phase. The full pipeline: specify → clarify → plan → tasks → analyze → implement.
 */
export function runWorkflow(
  graph: ProductGraph,
  spec: IncrementalSpec,
  config: ResolvedConfig,
): WorkflowResult {
  const phases: PhaseResult[] = [];

  phases.push(runSpecifyPhase(graph, spec));
  phases.push(runClarifyPhase(graph, spec, config.phases.clarify));
  phases.push(runPlanPhase(graph, spec));
  phases.push(runTasksPhase(graph, spec));
  phases.push(runAnalyzePhase(graph, spec));
  phases.push(runImplementPhase(graph, spec));

  const ok = phases.every((p) => p.ok);
  return { phases, ok };
}

// ---------------------------------------------------------------------------
// Specify phase — describe what changed and what's affected
// ---------------------------------------------------------------------------

export function runSpecifyPhase(
  _graph: ProductGraph,
  spec: IncrementalSpec,
): PhaseResult<SpecifyOutput> {
  const added: SpecifyNodeEntry[] = [];
  const removed: SpecifyNodeEntry[] = [];
  const modified: SpecifyNodeEntry[] = [];
  const impacted: SpecifyNodeEntry[] = [];

  for (const c of spec.changes) {
    const entry: SpecifyNodeEntry = {
      nodeId: c.nodeId,
      nodeKind: c.nodeKind,
      module: c.module,
      description: describeChange(c.changeKind, c.nodeId),
    };
    if (c.changeKind === 'added') added.push(entry);
    else if (c.changeKind === 'removed') removed.push(entry);
    else modified.push(entry);
  }

  for (const i of spec.impacts) {
    impacted.push({
      nodeId: i.nodeId,
      nodeKind: i.nodeKind,
      module: i.module,
      description: `Impacted via ${i.via}: ${i.reason}`,
    });
  }

  return {
    phase: 'specify',
    ok: true,
    data: {
      affectedModules: [...spec.summary.affectedModules],
      addedNodes: added,
      removedNodes: removed,
      modifiedNodes: modified,
      impactedNodes: impacted,
    },
    warnings: [],
  };
}

function describeChange(changeKind: ChangeKind, nodeId: string): string {
  switch (changeKind) {
    case 'added': return `New node "${nodeId}" added`;
    case 'removed': return `Node "${nodeId}" removed`;
    case 'renamed': return `Node "${nodeId}" renamed`;
    case 'structurally_changed': return `Node "${nodeId}" structure changed`;
    case 'behaviorally_changed': return `Node "${nodeId}" behavior changed`;
    case 'policy_changed': return `Node "${nodeId}" policy changed`;
  }
}

// ---------------------------------------------------------------------------
// Plan phase — produce implementation steps from incremental spec tasks
// ---------------------------------------------------------------------------

export function runPlanPhase(
  graph: ProductGraph,
  spec: IncrementalSpec,
): PhaseResult<PlanOutput> {
  const meta = buildNodeMetaMap(graph);
  const steps: PlanStep[] = [];

  for (const task of spec.tasks) {
    const m = meta.get(task.nodeId);
    const deps = findDependencies(graph, task.nodeId);

    steps.push({
      stepId: `step_${task.taskId}`,
      taskId: task.taskId,
      nodeId: task.nodeId,
      action: task.action,
      module: m?.module ?? '',
      nodeKind: m?.kind ?? 'unknown',
      description: task.reason,
      dependsOn: deps
        .filter((d) => spec.tasks.some((t) => t.nodeId === d))
        .map((d) => `step_${spec.tasks.find((t) => t.nodeId === d)!.taskId}`),
    });
  }

  return {
    phase: 'plan',
    ok: true,
    data: { steps },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Tasks phase — topological ordering of tasks
// ---------------------------------------------------------------------------

export function runTasksPhase(
  graph: ProductGraph,
  spec: IncrementalSpec,
): PhaseResult<TasksOutput> {
  const meta = buildNodeMetaMap(graph);

  // Build task dependency graph
  const taskNodeIds = new Set(spec.tasks.map((t) => t.nodeId));
  const taskDeps = new Map<string, string[]>();

  for (const task of spec.tasks) {
    const deps = findDependencies(graph, task.nodeId)
      .filter((d) => taskNodeIds.has(d) && d !== task.nodeId);
    taskDeps.set(task.taskId, deps
      .map((d) => spec.tasks.find((t) => t.nodeId === d)!.taskId));
  }

  // Topological sort (Kahn's algorithm)
  const ordered = topologicalSort(spec.tasks.map((t) => t.taskId), taskDeps);

  const orderedTasks: OrderedTask[] = spec.tasks.map((task) => {
    const order = ordered.indexOf(task.taskId);
    const blockedBy = taskDeps.get(task.taskId)!;
    return {
      taskId: task.taskId,
      order,
      nodeId: task.nodeId,
      action: task.action,
      module: meta.get(task.nodeId)?.module ?? '',
      blocked: false,
      blockedBy,
    };
  }).sort((a, b) => a.order - b.order);

  return {
    phase: 'tasks',
    ok: true,
    data: { orderedTasks },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Analyze phase — risk and dependency analysis
// ---------------------------------------------------------------------------

export function runAnalyzePhase(
  graph: ProductGraph,
  spec: IncrementalSpec,
): PhaseResult<AnalyzeOutput> {
  const analyses: TaskAnalysis[] = [];

  for (const task of spec.tasks) {
    const inbound = graph.edges.filter((e) => e.to === task.nodeId);
    const outbound = graph.edges.filter((e) => e.from === task.nodeId);
    const riskFactors: string[] = [];

    if (task.action === 'remove') riskFactors.push('removal');
    if (inbound.length > 5) riskFactors.push('high_inbound_edges');
    if (outbound.length > 5) riskFactors.push('high_outbound_edges');

    // Check if node is an entity (higher risk changes)
    const isEntity = spec.changes.some(
      (c) => c.nodeId === task.nodeId && c.nodeKind === 'entity',
    );
    if (isEntity && task.action === 'regenerate') riskFactors.push('entity_modification');

    const riskLevel = riskFactors.length >= 3 ? 'high' : riskFactors.length >= 1 ? 'medium' : 'low';

    analyses.push({
      taskId: task.taskId,
      nodeId: task.nodeId,
      riskLevel,
      riskFactors,
      dependencyCount: outbound.length,
      dependentCount: inbound.length,
    });
  }

  return {
    phase: 'analyze',
    ok: true,
    data: { analyses },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Implement phase — generate task instructions
// ---------------------------------------------------------------------------

export function runImplementPhase(
  graph: ProductGraph,
  spec: IncrementalSpec,
): PhaseResult<ImplementOutput> {
  const meta = buildNodeMetaMap(graph);
  const instructions: ImplementInstruction[] = [];

  for (const task of spec.tasks) {
    const m = meta.get(task.nodeId);
    const related = graph.edges
      .filter((e) => e.from === task.nodeId || e.to === task.nodeId)
      .map((e) => `${e.from} -[${e.kind}]-> ${e.to}`);

    instructions.push({
      taskId: task.taskId,
      nodeId: task.nodeId,
      module: m?.module ?? '',
      action: task.action,
      nodeKind: m?.kind ?? 'unknown',
      context: task.reason,
      relatedEdges: related,
    });
  }

  return {
    phase: 'implement',
    ok: true,
    data: { instructions },
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NodeMeta {
  readonly kind: string;
  readonly module: string;
}

function buildNodeMetaMap(graph: ProductGraph): Map<string, NodeMeta> {
  const map = new Map<string, NodeMeta>();
  map.set('product', { kind: 'product', module: '' });

  for (const mod of graph.modules) {
    map.set(mod.id, { kind: 'module', module: mod.name });
    for (const [, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item && 'kind' in item) {
            const typed = item as { id: string; kind: string };
            map.set(typed.id, { kind: typed.kind, module: mod.name });
          }
        }
      }
    }
  }

  return map;
}

function findDependencies(graph: ProductGraph, nodeId: string): string[] {
  return graph.edges
    .filter((e) => e.from === nodeId)
    .map((e) => e.to);
}

function topologicalSort(
  nodes: readonly string[],
  blockedBy: Map<string, string[]>,
): string[] {
  // Build reverse adjacency: prerequisite → nodes it unblocks
  const unblocks = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n, 0);

  for (const [node, prereqs] of blockedBy) {
    inDegree.set(node, inDegree.get(node)! + prereqs.length);
    for (const p of prereqs) {
      if (!unblocks.has(p)) unblocks.set(p, []);
      unblocks.get(p)!.push(node);
    }
  }

  const queue: string[] = [];
  for (const [n, deg] of inDegree) {
    if (deg === 0) queue.push(n);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    for (const dep of unblocks.get(current) ?? []) {
      const newDeg = inDegree.get(dep)! - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  // If there are remaining nodes (cycle), append them
  for (const n of nodes) {
    if (!result.includes(n)) result.push(n);
  }

  return result;
}
