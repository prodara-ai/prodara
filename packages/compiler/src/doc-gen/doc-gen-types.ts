// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Shared Node Types
// ---------------------------------------------------------------------------
// Single source of truth for graph node interfaces used across the doc-gen
// module. These shapes mirror what the graph builder serializes.

import type { GraphTypeRef } from '../graph/graph-types.js';

// ---------------------------------------------------------------------------
// Field references
// ---------------------------------------------------------------------------

export interface FieldRef {
  readonly name: string;
  readonly type: GraphTypeRef;
}

// ---------------------------------------------------------------------------
// Node shapes
// ---------------------------------------------------------------------------

export interface ActorNode {
  readonly id: string;
  readonly kind: 'actor';
  readonly name: string;
  readonly title: string | null;
  readonly description: string | null;
}

export interface CapabilityNode {
  readonly id: string;
  readonly kind: 'capability';
  readonly name: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly actors: readonly string[];
}

export interface EntityNode {
  readonly id: string;
  readonly kind: 'entity';
  readonly name: string;
  readonly fields: readonly FieldRef[];
}

export interface ValueNode {
  readonly id: string;
  readonly kind: 'value';
  readonly name: string;
  readonly fields: readonly FieldRef[];
}

export interface EnumNode {
  readonly id: string;
  readonly kind: 'enum';
  readonly name: string;
  readonly members: readonly { readonly name: string; readonly metadata?: Record<string, unknown> }[];
}

export interface RuleNode {
  readonly id: string;
  readonly kind: 'rule';
  readonly name: string;
  readonly entity: string;
  readonly condition: unknown;
  readonly message: string;
}

export interface WorkflowNode {
  readonly id: string;
  readonly kind: 'workflow';
  readonly name: string;
  readonly capability?: string | null;
  readonly authorization?: readonly { readonly actor: string; readonly permissions: readonly string[] }[];
  readonly input?: readonly FieldRef[];
  readonly reads?: readonly string[];
  readonly writes?: readonly string[];
  readonly steps?: readonly StepNode[];
  readonly transitions?: readonly { readonly entity: string; readonly field: string; readonly from: string; readonly to: string }[];
  readonly effects?: readonly Record<string, string>[];
  readonly returns?: readonly { readonly name: string; readonly type: GraphTypeRef }[];
}

export type StepNode =
  | { readonly call: string }
  | { readonly fail: string }
  | { readonly decide: string; readonly branches: readonly { readonly when: string; readonly action: { readonly call?: string; readonly fail?: string } }[] };

export interface ActionNode {
  readonly id: string;
  readonly kind: 'action';
  readonly name: string;
  readonly title: string | null;
  readonly workflow: string | null;
}

export interface EventNode {
  readonly id: string;
  readonly kind: 'event';
  readonly name: string;
  readonly payload: GraphTypeRef | null;
  readonly description: string | null;
}

export interface ScheduleNode {
  readonly id: string;
  readonly kind: 'schedule';
  readonly name: string;
  readonly cron: string | null;
  readonly description: string | null;
}

export interface SurfaceNode {
  readonly id: string;
  readonly kind: 'surface';
  readonly name: string;
  readonly surface_kind: string | null;
  readonly title: string | null;
  readonly capability?: string | null;
  readonly binds: string | null;
}

export interface RenderingNode {
  readonly id: string;
  readonly kind: 'rendering';
  readonly name: string;
  readonly target: string | null;
  readonly platform: string | null;
  readonly layout: string | null;
}

export interface TokensNode {
  readonly id: string;
  readonly kind: 'tokens';
  readonly name: string;
  readonly categories: readonly {
    readonly name: string;
    readonly tokens: readonly { readonly name: string; readonly value: unknown }[];
  }[];
}

export interface StorageNode {
  readonly id: string;
  readonly kind: 'storage';
  readonly name: string;
  readonly target: string | null;
  readonly model: string | null;
  readonly table: string | null;
}

export interface SecurityNode {
  readonly id: string;
  readonly kind: 'security';
  readonly name: string;
  readonly applies_to: readonly string[];
}

export interface PrivacyNode {
  readonly id: string;
  readonly kind: 'privacy';
  readonly name: string;
  readonly applies_to: readonly string[];
  readonly classification: string | null;
  readonly retention: string | null;
  readonly exportable: string | null;
  readonly erasable: string | null;
}

export interface TestNode {
  readonly id: string;
  readonly kind: 'test';
  readonly name: string;
}

export interface StringsNode {
  readonly id: string;
  readonly kind: 'strings';
  readonly name: string;
  readonly entries: Readonly<Record<string, string>>;
}
