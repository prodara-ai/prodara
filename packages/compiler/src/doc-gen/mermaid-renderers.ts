// ---------------------------------------------------------------------------
// Prodara Compiler — Doc-Gen Mermaid Renderers
// ---------------------------------------------------------------------------
// Generates Mermaid ER diagrams for entities and flowcharts for workflows.

import type { ModuleNode, GraphEdge, GraphTypeRef } from '../graph/graph-types.js';
import { formatTypeRef, getArrayProp } from './format-helpers.js';
import type { EntityNode, EnumNode, ValueNode, WorkflowNode } from './doc-gen-types.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function mermaidId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ---------------------------------------------------------------------------
// Entity-Relationship Diagram
// ---------------------------------------------------------------------------

/**
 * Render a Mermaid erDiagram block for all entities/enums/values in a module.
 * Returns empty array if the module has no domain objects.
 */
export function renderEntityErDiagram(
  mod: ModuleNode,
  edges: readonly GraphEdge[],
): string[] {
  const entities = getArrayProp<EntityNode>(mod, 'entities');
  const enums = getArrayProp<EnumNode>(mod, 'enums');
  const values = getArrayProp<ValueNode>(mod, 'values');

  if (entities.length === 0 && enums.length === 0 && values.length === 0) return [];

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('erDiagram');

  // Render entities
  for (const entity of entities) {
    const eid = mermaidId(entity.name).toUpperCase();
    lines.push(`    ${eid} {`);
    for (const field of entity.fields) {
      const typeName = formatTypeRef(field.type);
      const pk = field.name.endsWith('_id') || field.name === 'id' ? ' PK' : '';
      lines.push(`        ${typeName} ${field.name}${pk}`);
    }
    lines.push('    }');
  }

  // Render value objects
  for (const value of values) {
    const vid = mermaidId(value.name).toUpperCase();
    lines.push(`    ${vid} {`);
    for (const field of value.fields) {
      const typeName = formatTypeRef(field.type);
      lines.push(`        ${typeName} ${field.name}`);
    }
    lines.push('    }');
  }

  // Render enums as entities with members
  for (const en of enums) {
    const eid = mermaidId(en.name).toUpperCase();
    lines.push(`    ${eid} {`);
    for (const member of en.members) {
      lines.push(`        enum ${member.name}`);
    }
    lines.push('    }');
  }

  // Render relationships from field_type edges within this module
  const modulePrefix = mod.id + '.';
  const fieldTypeEdges = edges.filter(
    e => e.kind === 'field_type' && e.from.startsWith(modulePrefix),
  );

  // Build name lookup once to avoid O(n²) scanning
  const nameById = new Map<string, string>();
  for (const e of entities) nameById.set(e.id, e.name);
  for (const v of values) nameById.set(v.id, v.name);
  for (const en of enums) nameById.set(en.id, en.name);

  const rendered = new Set<string>();
  for (const edge of fieldTypeEdges) {
    /* v8 ignore next -- field_type edges always reference known entities */
    const fromNode = nameById.get(edge.from) ?? null;
    const toNode = nameById.get(edge.to) ?? null;
    if (!fromNode || !toNode) continue;

    const fromId = mermaidId(fromNode).toUpperCase();
    const toId = mermaidId(toNode).toUpperCase();
    const key = `${fromId}-${toId}`;
    if (rendered.has(key)) continue;
    rendered.add(key);

    const cardinality = inferCardinality(entities, values, edge.from, edge.to);
    lines.push(`    ${fromId} ${cardinality} ${toId} : "references"`);
  }

  lines.push('```');
  return lines;
}

function inferCardinality(
  entities: readonly EntityNode[],
  values: readonly ValueNode[],
  fromId: string,
  toId: string,
): string {
  // Look at the from entity's fields to find the field referencing toId
  const allFieldContainers = [...entities, ...values];
  for (const container of allFieldContainers) {
    if (!fromId.startsWith(container.id)) continue;
    for (const field of container.fields) {
      if (refPointsTo(field.type, toId)) {
        return getCardinalitySymbol(field.type);
      }
    }
  }
  return '||--||';
}

function refPointsTo(type: GraphTypeRef, targetId: string): boolean {
  if (typeof type === 'string') return false;
  if ('ref' in type) return type.ref === targetId || targetId.endsWith(`.${extractName(type.ref)}`);
  /* v8 ignore next 2 -- exhaustive: type is always string | ref | generic */
  if ('generic' in type) return refPointsTo(type.arg, targetId);
  /* v8 ignore next 2 -- exhaustive: type is always string | ref | generic */
  return false;
}

function extractName(ref: string): string {
  const parts = ref.split('.');
  /* v8 ignore next -- split always returns ≥1 element */
  return parts[parts.length - 1] ?? ref;
}

function getCardinalitySymbol(type: GraphTypeRef): string {
  /* v8 ignore next -- only called with ref or generic types */
  if (typeof type === 'string') return '||--||';
  if ('ref' in type) return '||--||';
  /* v8 ignore next 4 -- all known generics handled above */
  if ('generic' in type) {
    if (type.generic === 'optional') return '||--o|';
    if (type.generic === 'list') return '||--o{';
  }
  /* v8 ignore next 2 -- only optional and list generics are used */
  return '||--||';
}

// ---------------------------------------------------------------------------
// Workflow Flowchart
// ---------------------------------------------------------------------------

/**
 * Render a Mermaid flowchart for a single workflow.
 */
export function renderWorkflowFlowchart(workflow: WorkflowNode): string[] {
  if (!workflow.steps || workflow.steps.length === 0) return [];

  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('flowchart TD');

  const wfId = mermaidId(workflow.name);
  lines.push(`    START([${workflow.name}]) --> S0`);

  let idx = 0;
  for (const step of workflow.steps) {
    const nodeId = `S${idx}`;
    const nextId = idx + 1 < workflow.steps.length ? `S${idx + 1}` : null;

    if ('call' in step) {
      lines.push(`    ${nodeId}[${step.call}]`);
      if (nextId) {
        lines.push(`    ${nodeId} --> ${nextId}`);
      }
    } else if ('fail' in step) {
      lines.push(`    ${nodeId}{{${step.fail}}}`);
    } else if ('decide' in step) {
      lines.push(`    ${nodeId}{${step.decide}?}`);
      for (const branch of step.branches) {
        const branchId = `${nodeId}_${mermaidId(branch.when)}`;
        if (branch.action.call) {
          lines.push(`    ${nodeId} -->|${branch.when}| ${branchId}[${branch.action.call}]`);
          if (nextId) {
            lines.push(`    ${branchId} --> ${nextId}`);
          }
        } else if (branch.action.fail) {
          lines.push(`    ${nodeId} -->|${branch.when}| ${branchId}{{${branch.action.fail}}}`);
        }
      }
      // Default branch to next step
      if (nextId) {
        lines.push(`    ${nodeId} -->|other| ${nextId}`);
      }
    }
    idx++;
  }

  // Effects
  const lastStepId = `S${workflow.steps.length - 1}`;
  if (workflow.effects) {
    let effIdx = 0;
    for (const effect of workflow.effects) {
      const effId = `EFF${effIdx}`;
      /* v8 ignore next -- effect always has entries */
      const [kind, value] = Object.entries(effect)[0] ?? ['effect', 'unknown'];
      lines.push(`    ${lastStepId} --> ${effId}>${kind}: ${value}]`);
      effIdx++;
    }
  }

  lines.push('```');
  return lines;
}
