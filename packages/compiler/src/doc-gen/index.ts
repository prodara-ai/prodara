// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Barrel Exports
// ---------------------------------------------------------------------------

export { generateDocs, writeDocs } from './doc-renderer.js';
export type { DocFile } from './doc-renderer.js';
export type { SectionContext } from './section-renderers.js';
export type {
  ActorNode, CapabilityNode, EntityNode, ValueNode, EnumNode,
  RuleNode, WorkflowNode, ActionNode, EventNode, ScheduleNode,
  SurfaceNode, RenderingNode, TokensNode, StorageNode,
  SecurityNode, PrivacyNode, TestNode, StringsNode, FieldRef, StepNode,
} from './doc-gen-types.js';
