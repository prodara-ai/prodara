// ---------------------------------------------------------------------------
// Prodara Compiler — Implementation Phase
// ---------------------------------------------------------------------------
// Transforms task instructions into agent-consumable prompts, dispatches
// them to the configured agent driver, and collects results. Handles
// seam preservation for regeneration workflows.

import type { ProductGraph, ModuleNode, GraphEdge } from '../graph/graph-types.js';
import type { IncrementalSpec } from '../incremental/types.js';
import type { AgentDriver, AgentRequest, PromptFileOutput } from '../agent/types.js';
import type { GovernanceRule } from '../governance/types.js';
import type {
  ImplementTask,
  ImplementPrompt,
  ImplementPhaseResult,
  ImplementTaskResult,
  SeamRange,
} from './types.js';

// ---------------------------------------------------------------------------
// Seam markers
// ---------------------------------------------------------------------------

const SEAM_START = '// PRODARA SEAM START';
const SEAM_END = '// PRODARA SEAM END';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build rich implementation tasks from the incremental spec + graph.
 * Each task includes node metadata, field definitions, and related edges.
 */
export function buildImplementTasks(
  graph: ProductGraph,
  spec: IncrementalSpec,
): ImplementTask[] {
  const nodeMap = buildNodeMap(graph);
  const tasks: ImplementTask[] = [];

  for (const specTask of spec.tasks) {
    const node = nodeMap.get(specTask.nodeId);
    const related = graph.edges
      .filter((e) => e.from === specTask.nodeId || e.to === specTask.nodeId)
      .map(formatEdge);
    const fields = node ? extractFieldDefinitions(node) : [];

    tasks.push({
      taskId: specTask.taskId,
      nodeId: specTask.nodeId,
      module: node?.module ?? '',
      action: specTask.action as ImplementTask['action'],
      nodeKind: node?.kind ?? 'unknown',
      context: specTask.reason,
      relatedEdges: related,
      fieldDefinitions: fields,
    });
  }

  return tasks;
}

/**
 * Generate an implementation prompt for a single task.
 * The prompt includes full context: constitution, governance, graph slice,
 * field definitions, and related edges.
 */
export function buildImplementPrompt(
  task: ImplementTask,
  graph: ProductGraph,
  constitution: string | null,
  governance: readonly GovernanceRule[],
): ImplementPrompt {
  const sections: string[] = [];

  // Header
  sections.push(`# Implementation Task: ${task.taskId}`);
  sections.push(`Action: ${task.action} | Node: ${task.nodeId} (${task.nodeKind}) | Module: ${task.module}`);
  sections.push('');

  // Context from the incremental spec
  sections.push(`## Context`);
  sections.push(task.context);
  sections.push('');

  // Field definitions
  if (task.fieldDefinitions.length > 0) {
    sections.push('## Field Definitions');
    for (const f of task.fieldDefinitions) {
      sections.push(`- ${f}`);
    }
    sections.push('');
  }

  // Related edges (dependencies)
  if (task.relatedEdges.length > 0) {
    sections.push('## Related Edges');
    for (const e of task.relatedEdges) {
      sections.push(`- ${e}`);
    }
    sections.push('');
  }

  // Governance rules
  if (governance.length > 0) {
    sections.push('## Governance Rules');
    for (const r of governance) {
      sections.push(`- [${r.category}] ${r.rule}`);
    }
    sections.push('');
  }

  // Seam preservation note for regeneration
  if (task.action === 'regenerate') {
    sections.push('## Seam Preservation');
    sections.push('Preserve any user code between `// PRODARA SEAM START <id>` and `// PRODARA SEAM END <id>` markers.');
    sections.push('Do not modify or remove seam-protected sections.');
    sections.push('');
  }

  // Graph slice
  const graphSlice = buildGraphSlice(task, graph);

  return {
    taskId: task.taskId,
    nodeId: task.nodeId,
    action: task.action,
    prompt: sections.join('\n'),
    graphSlice,
  };
}

/**
 * Execute implementation for all tasks using the provided agent driver.
 */
export async function executeImplementation(
  tasks: readonly ImplementTask[],
  prompts: readonly ImplementPrompt[],
  driver: AgentDriver,
  constitution: string | null,
  governance: string | null,
): Promise<ImplementPhaseResult> {
  const results: ImplementTaskResult[] = [];
  let totalGenerated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const prompt of prompts) {
    const task = tasks.find((t) => t.taskId === prompt.taskId);
    if (!task || task.action === 'verify') {
      totalSkipped++;
      results.push({
        taskId: prompt.taskId,
        nodeId: prompt.nodeId,
        status: 'skipped',
        platform: driver.platform,
        duration_ms: 0,
        outputPath: null,
      });
      continue;
    }

    if (task.action === 'remove') {
      totalSkipped++;
      results.push({
        taskId: prompt.taskId,
        nodeId: prompt.nodeId,
        status: 'skipped',
        platform: driver.platform,
        duration_ms: 0,
        outputPath: null,
      });
      continue;
    }

    const request: AgentRequest = {
      prompt: prompt.prompt,
      context: {
        constitution,
        graphSlice: prompt.graphSlice,
        governance,
        additionalContext: {},
      },
      capability: 'implement',
      platform: driver.platform,
    };

    const start = Date.now();
    const response = await driver.execute(request);
    const duration_ms = Date.now() - start;

    if (response.status === 'success') {
      totalGenerated++;
    } else {
      totalFailed++;
    }

    results.push({
      taskId: prompt.taskId,
      nodeId: prompt.nodeId,
      status: response.status,
      platform: driver.platform,
      duration_ms,
      outputPath: null,
    });
  }

  return {
    ok: totalFailed === 0,
    tasks: results,
    totalGenerated,
    totalFailed,
    totalSkipped,
  };
}

/**
 * Extract seam-protected ranges from file content.
 */
export function extractSeams(content: string): SeamRange[] {
  const lines = content.split('\n');
  const seams: SeamRange[] = [];
  let currentSeam: { id: string; startLine: number; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.startsWith(SEAM_START)) {
      const id = trimmed.slice(SEAM_START.length).trim();
      currentSeam = { id, startLine: i, lines: [] };
    } else if (trimmed.startsWith(SEAM_END) && currentSeam) {
      seams.push({
        id: currentSeam.id,
        startLine: currentSeam.startLine,
        endLine: i,
        content: currentSeam.lines.join('\n'),
      });
      currentSeam = null;
    } else if (currentSeam) {
      currentSeam.lines.push(line);
    }
  }

  return seams;
}

/**
 * Reapply seam-protected content into regenerated output.
 * Matches seams by ID and replaces the content between markers.
 */
export function applySeams(newContent: string, seams: readonly SeamRange[]): string {
  if (seams.length === 0) return newContent;

  const lines = newContent.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.startsWith(SEAM_START)) {
      const id = trimmed.slice(SEAM_START.length).trim();
      const savedSeam = seams.find((s) => s.id === id);

      // Write the seam start marker
      result.push(line);

      if (savedSeam) {
        // Inject the preserved content
        result.push(savedSeam.content);
      }

      // Skip to the end marker
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith(SEAM_END)) {
        if (!savedSeam) {
          result.push(lines[i]!);
        }
        i++;
      }

      // Write the end marker
      if (i < lines.length) {
        result.push(lines[i]!);
      }
    } else {
      result.push(line);
    }
    i++;
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface NodeInfo {
  readonly kind: string;
  readonly module: string;
  readonly node: Record<string, unknown>;
}

function buildNodeMap(graph: ProductGraph): Map<string, NodeInfo> {
  const map = new Map<string, NodeInfo>();

  for (const mod of graph.modules) {
    for (const [key, value] of Object.entries(mod)) {
      if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (typeof item === 'object' && item !== null && 'id' in item && 'kind' in item) {
          const node = item as Record<string, unknown>;
          map.set(node['id'] as string, {
            kind: node['kind'] as string,
            module: mod.name,
            node,
          });
        }
      }
    }
  }

  return map;
}

function extractFieldDefinitions(info: NodeInfo): string[] {
  const fields: string[] = [];
  const node = info.node;

  if (Array.isArray(node['fields'])) {
    for (const f of node['fields']) {
      if (typeof f === 'object' && f !== null && 'name' in f && 'type' in f) {
        const field = f as { name: string; type: unknown };
        fields.push(`${field.name}: ${formatType(field.type)}`);
      }
    }
  }

  return fields;
}

function formatType(type: unknown): string {
  if (typeof type === 'string') return type;
  if (typeof type === 'object' && type !== null) {
    if ('ref' in type) return `ref(${(type as { ref: string }).ref})`;
    if ('generic' in type && 'arg' in type) {
      const g = type as { generic: string; arg: unknown };
      return `${g.generic}<${formatType(g.arg)}>`;
    }
  }
  return 'unknown';
}

function formatEdge(edge: GraphEdge): string {
  return `${edge.from} -[${edge.kind}]-> ${edge.to}`;
}

function buildGraphSlice(task: ImplementTask, graph: ProductGraph): string {
  // Find the module containing this node
  const mod = graph.modules.find((m) => m.name === task.module);
  if (!mod) return '{}';

  // Extract just the relevant node data from the module
  const relevantEdges = graph.edges.filter(
    (e) => e.from === task.nodeId || e.to === task.nodeId,
  );

  return JSON.stringify({ module: mod.name, nodeId: task.nodeId, edges: relevantEdges }, null, 2);
}
