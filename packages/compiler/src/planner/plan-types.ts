// ---------------------------------------------------------------------------
// Prodara Compiler — Planning Types
// ---------------------------------------------------------------------------

import type { EdgeKind } from '../types.js';

export type ChangeKind =
  | 'added'
  | 'removed'
  | 'renamed'
  | 'structurally_changed'
  | 'behaviorally_changed'
  | 'policy_changed';

export interface NodeChange {
  readonly nodeId: string;
  readonly changeKind: ChangeKind;
  readonly details?: string;
}

export interface ImpactEntry {
  readonly nodeId: string;
  readonly reason: string;
  readonly via: string;        // edge kind or path
  readonly depth: number;
}

export interface PlanTask {
  readonly taskId: string;
  readonly action: 'generate' | 'regenerate' | 'remove' | 'verify';
  readonly nodeId: string;
  readonly reason: string;
}

export interface Plan {
  readonly format: 'prodara-plan';
  readonly version: '0.1.0';
  readonly changes: readonly NodeChange[];
  readonly impacts: readonly ImpactEntry[];
  readonly tasks: readonly PlanTask[];
}
