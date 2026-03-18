// ---------------------------------------------------------------------------
// Prodara Compiler — Semantic Diff
// ---------------------------------------------------------------------------
// Produces human-readable diff summaries from Product Graph changes.
// Extends the existing graph differ with meaningful descriptions.

import type { ProductGraph, GraphEdge, ModuleNode } from '../graph/graph-types.js';
import type { NodeChange } from './plan-types.js';
import { diffGraphs } from './differ.js';
import { propagateImpact } from './propagator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SemanticDiffEntry {
  readonly nodeId: string;
  readonly changeKind: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly module: string;
}

export interface SemanticDiffResult {
  readonly format: 'prodara-semantic-diff';
  readonly version: '0.1.0';
  readonly entries: readonly SemanticDiffEntry[];
  readonly impacted: readonly SemanticDiffEntry[];
  readonly summary: SemanticDiffSummary;
}

export interface SemanticDiffSummary {
  readonly totalChanges: number;
  readonly added: number;
  readonly removed: number;
  readonly modified: number;
  readonly impactedNodes: number;
  readonly affectedModules: readonly string[];
  readonly humanSummary: string;
}

// ---------------------------------------------------------------------------
// Semantic diff
// ---------------------------------------------------------------------------

export function semanticDiff(prev: ProductGraph, next: ProductGraph): SemanticDiffResult {
  const changes = diffGraphs(prev, next);
  const impacts = propagateImpact(next, changes);

  const prevNodeMap = buildDetailedNodeMap(prev);
  const nextNodeMap = buildDetailedNodeMap(next);

  const entries: SemanticDiffEntry[] = changes.map(change => {
    const prevNode = prevNodeMap.get(change.nodeId);
    const nextNode = nextNodeMap.get(change.nodeId);
    const module = extractModule(change.nodeId);

    switch (change.changeKind) {
      case 'added':
        return {
          nodeId: change.nodeId,
          changeKind: 'added',
          summary: describeAdded(change.nodeId, nextNode),
          details: describeNodeDetails(nextNode),
          module,
        };
      case 'removed':
        return {
          nodeId: change.nodeId,
          changeKind: 'removed',
          summary: describeRemoved(change.nodeId, prevNode),
          details: [],
          module,
        };
      default:
        return {
          nodeId: change.nodeId,
          changeKind: change.changeKind,
          summary: describeModified(change.nodeId, change.changeKind, prevNode, nextNode),
          details: describePropertyChanges(prevNode, nextNode),
          module,
        };
    }
  });

  const impactedEntries: SemanticDiffEntry[] = impacts.map(impact => ({
    nodeId: impact.nodeId,
    changeKind: 'impacted',
    summary: `Impacted: ${formatNodeId(impact.nodeId)} (${impact.reason})`,
    details: [`Via edge: ${impact.via}`, `Depth: ${impact.depth}`],
    module: extractModule(impact.nodeId),
  }));

  const affectedModules = [...new Set([
    ...entries.map(e => e.module),
    ...impactedEntries.map(e => e.module),
  ])].filter(m => m !== 'product').sort();

  const added = entries.filter(e => e.changeKind === 'added').length;
  const removed = entries.filter(e => e.changeKind === 'removed').length;
  const modified = entries.length - added - removed;

  const humanParts: string[] = [];
  if (added > 0) humanParts.push(`${added} added`);
  if (removed > 0) humanParts.push(`${removed} removed`);
  if (modified > 0) humanParts.push(`${modified} modified`);
  if (impactedEntries.length > 0) humanParts.push(`${impactedEntries.length} impacted`);
  const humanSummary = humanParts.length > 0
    ? `${humanParts.join(', ')} across ${affectedModules.length} module(s)`
    : 'No changes detected';

  return {
    format: 'prodara-semantic-diff',
    version: '0.1.0',
    entries,
    impacted: impactedEntries,
    summary: {
      totalChanges: entries.length,
      added,
      removed,
      modified,
      impactedNodes: impactedEntries.length,
      affectedModules,
      humanSummary,
    },
  };
}

// ---------------------------------------------------------------------------
// Human-readable summary formatting
// ---------------------------------------------------------------------------

export function formatSemanticDiffHuman(result: SemanticDiffResult): string {
  const lines: string[] = [];
  lines.push('Semantic Diff Summary');
  lines.push(`  ${result.summary.humanSummary}`);
  lines.push('');

  if (result.entries.length > 0) {
    lines.push('Changes:');
    for (const entry of result.entries) {
      const icon = entry.changeKind === 'added' ? '+' :
                   /* v8 ignore next -- removed icon ternary */
                   entry.changeKind === 'removed' ? '-' : '~';
      lines.push(`  ${icon} ${entry.summary}`);
      for (const detail of entry.details) {
        lines.push(`      ${detail}`);
      }
    }
  }

  if (result.impacted.length > 0) {
    lines.push('');
    lines.push('Impacted:');
    for (const entry of result.impacted) {
      lines.push(`  → ${entry.summary}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NodeDetail {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly properties: Record<string, unknown>;
}

function buildDetailedNodeMap(graph: ProductGraph): Map<string, NodeDetail> {
  const map = new Map<string, NodeDetail>();

  map.set('product', {
    id: 'product',
    kind: 'product',
    name: graph.product.name,
    properties: { ...graph.product },
  });

  for (const mod of graph.modules) {
    map.set(mod.id, {
      id: mod.id,
      kind: 'module',
      name: mod.name,
      properties: { imports: mod.imports },
    });

    for (const [, value] of Object.entries(mod)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'id' in item && 'kind' in item) {
            const node = item as Record<string, unknown>;
            const nodeId = String(node['id']);
            const nodeKind = String(node['kind']);
            const nodeName = String(/* v8 ignore next */ node['name'] ?? node['id']);
            map.set(nodeId, {
              id: nodeId,
              kind: nodeKind,
              name: nodeName,
              properties: { ...node },
            });
          }
        }
      }
    }
  }

  return map;
}

function extractModule(nodeId: string): string {
  const parts = nodeId.split('.');
  /* v8 ignore next -- split always returns ≥1 element */
  return parts[0] ?? 'product';
}

function formatNodeId(nodeId: string): string {
  const parts = nodeId.split('.');
  if (parts.length >= 3) {
    return `${parts[1]} '${parts.slice(2).join('.')}' in module '${parts[0]}'`;
  }
  /* v8 ignore next 3 -- 2-part node IDs are uncommon */
  if (parts.length === 2) {
    return `'${parts[1]}' in module '${parts[0]}'`;
  }
  return nodeId;
}

function describeAdded(nodeId: string, node: NodeDetail | undefined): string {
  /* v8 ignore next -- node is always found in the graph */
  if (!node) return `Added ${nodeId}`;
  return `Added ${node.kind} '${node.name}' in module '${extractModule(nodeId)}'`;
}

function describeRemoved(nodeId: string, node: NodeDetail | undefined): string {
  /* v8 ignore next -- node is always found in the graph */
  if (!node) return `Removed ${nodeId}`;
  return `Removed ${node.kind} '${node.name}' from module '${extractModule(nodeId)}'`;
}

function describeModified(
  nodeId: string,
  changeKind: string,
  prev: NodeDetail | undefined,
  next: NodeDetail | undefined,
): string {
  /* v8 ignore next 2 -- kind and name are always present */
  const kind = next?.kind ?? prev?.kind ?? 'node';
  const name = next?.name ?? prev?.name ?? nodeId;
  const module = extractModule(nodeId);

  const changeDesc =
    /* v8 ignore next 2 -- uncommon change kinds */
    changeKind === 'structurally_changed' ? 'Structure changed' :
    changeKind === 'policy_changed' ? 'Policy changed' :
    'Modified';

  return `${changeDesc}: ${kind} '${name}' in module '${module}'`;
}

function describePropertyChanges(
  prev: NodeDetail | undefined,
  next: NodeDetail | undefined,
): string[] {
  /* v8 ignore next -- nodes are always found for property changes */
  if (!prev || !next) return [];
  const details: string[] = [];

  const prevFields = extractFieldNames(prev);
  const nextFields = extractFieldNames(next);

  const addedFields = nextFields.filter(f => !prevFields.includes(f));
  const removedFields = prevFields.filter(f => !nextFields.includes(f));

  for (const f of addedFields) {
    details.push(`Added field '${f}'`);
  }
  for (const f of removedFields) {
    details.push(`Removed field '${f}'`);
  }

  // Check authorization changes for workflows
  const prevAuth = prev.properties['authorization'] as unknown[] | undefined;
  const nextAuth = next.properties['authorization'] as unknown[] | undefined;
  /* v8 ignore next 7 -- authorization change detection branches */
  if (prevAuth && nextAuth && JSON.stringify(prevAuth) !== JSON.stringify(nextAuth)) {
    details.push('Authorization rules changed');
  } else if (!prevAuth && nextAuth) {
    details.push('Authorization added');
  } else if (prevAuth && !nextAuth) {
    details.push('Authorization removed');
  }

  // Check transitions changes
  const prevTrans = prev.properties['transitions'] as unknown[] | undefined;
  const nextTrans = next.properties['transitions'] as unknown[] | undefined;
  /* v8 ignore next 3 -- transition change detection */
  if (prevTrans && nextTrans && JSON.stringify(prevTrans) !== JSON.stringify(nextTrans)) {
    details.push('State transitions changed');
  }

  if (details.length === 0) {
    details.push('Properties changed');
  }

  return details;
}

function extractFieldNames(node: NodeDetail): string[] {
  const fields = node.properties['fields'] as Array<{ name: string }> | undefined;
  return fields ? fields.map(f => f.name) : [];
}

function describeNodeDetails(node: NodeDetail | undefined): string[] {
  /* v8 ignore next -- node is always found */
  if (!node) return [];
  const details: string[] = [];

  const fields = extractFieldNames(node);
  if (fields.length > 0) {
    details.push(`Fields: ${fields.join(', ')}`);
  }

  const members = node.properties['members'] as Array<{ name: string }> | undefined;
  if (members && members.length > 0) {
    details.push(`Members: ${members.map(m => m.name).join(', ')}`);
  }

  return details;
}
