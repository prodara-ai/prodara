// ---------------------------------------------------------------------------
// Prodara Compiler — Implementation Phase Types
// ---------------------------------------------------------------------------

import type { AgentPlatform, AgentStatus } from '../agent/types.js';

export type ImplementAction = 'generate' | 'regenerate' | 'remove' | 'verify';

export interface ImplementTask {
  readonly taskId: string;
  readonly nodeId: string;
  readonly module: string;
  readonly action: ImplementAction;
  readonly nodeKind: string;
  readonly context: string;
  readonly relatedEdges: readonly string[];
  readonly fieldDefinitions: readonly string[];
}

export interface ImplementPrompt {
  readonly taskId: string;
  readonly nodeId: string;
  readonly action: ImplementAction;
  readonly prompt: string;
  readonly graphSlice: string;
}

export interface ImplementTaskResult {
  readonly taskId: string;
  readonly nodeId: string;
  readonly status: AgentStatus;
  readonly platform: AgentPlatform;
  readonly duration_ms: number;
  readonly outputPath: string | null;
}

export interface ImplementPhaseResult {
  readonly ok: boolean;
  readonly tasks: readonly ImplementTaskResult[];
  readonly totalGenerated: number;
  readonly totalFailed: number;
  readonly totalSkipped: number;
}

export interface SeamRange {
  readonly id: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly content: string;
}
