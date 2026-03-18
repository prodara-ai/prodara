// ---------------------------------------------------------------------------
// Prodara Compiler — Planner
// ---------------------------------------------------------------------------
// Orchestrates diff → impact propagation → task generation.

import type { ProductGraph } from '../graph/graph-types.js';
import type { Plan, PlanTask, NodeChange } from './plan-types.js';
import { diffGraphs } from './differ.js';
import { propagateImpact } from './propagator.js';

export function createPlan(prev: ProductGraph, next: ProductGraph): Plan {
  const changes = diffGraphs(prev, next);
  const impacts = propagateImpact(next, changes);

  const tasks: PlanTask[] = [];
  let taskSeq = 1;

  // Tasks for directly changed nodes
  for (const change of changes) {
    let action: PlanTask['action'];
    switch (change.changeKind) {
      case 'added':
        action = 'generate';
        break;
      case 'removed':
        action = 'remove';
        break;
      default:
        action = 'regenerate';
        break;
    }
    tasks.push({
      taskId: `task-${String(taskSeq++).padStart(4, '0')}`,
      action,
      nodeId: change.nodeId,
      reason: change.changeKind,
    });
  }

  // Tasks for impacted nodes
  for (const impact of impacts) {
    tasks.push({
      taskId: `task-${String(taskSeq++).padStart(4, '0')}`,
      action: 'verify',
      nodeId: impact.nodeId,
      reason: impact.reason,
    });
  }

  return {
    format: 'prodara-plan',
    version: '0.1.0',
    changes,
    impacts,
    tasks,
  };
}

/**
 * Create first-build plan (no previous graph).
 */
export function createInitialPlan(graph: ProductGraph): Plan {
  const changes: NodeChange[] = [];
  // All nodes are "added"
  changes.push({ nodeId: 'product', changeKind: 'added' });
  for (const mod of graph.modules) {
    changes.push({ nodeId: mod.id, changeKind: 'added' });
    for (const [, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item) {
            changes.push({ nodeId: (item as { id: string }).id, changeKind: 'added' });
          }
        }
      }
    }
  }

  const tasks: PlanTask[] = changes.map((c, i) => ({
    taskId: `task-${String(i + 1).padStart(4, '0')}`,
    action: 'generate' as const,
    nodeId: c.nodeId,
    reason: 'initial build',
  }));

  return {
    format: 'prodara-plan',
    version: '0.1.0',
    changes: changes.sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    impacts: [],
    tasks,
  };
}
