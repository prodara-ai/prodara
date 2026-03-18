// ---------------------------------------------------------------------------
// Prodara CLI — Cross-Artifact Analysis
// ---------------------------------------------------------------------------
// Performs cross-spec consistency, coverage, and quality analysis on the
// Product Graph.

import type { ProductGraph } from '../graph/graph-types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConsistencyKind =
  | 'orphan_node'
  | 'missing_reference'
  | 'cross_module_coupling'
  | 'missing_test_coverage'
  | 'missing_authorization'
  | 'unused_event'
  | 'surface_incomplete';

export interface ConsistencyCheck {
  readonly kind: ConsistencyKind;
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
  readonly nodeIds: readonly string[];
}

export interface CoverageReport {
  readonly entitiesWithTests: number;
  readonly entitiesTotal: number;
  readonly workflowsWithAuth: number;
  readonly workflowsTotal: number;
  readonly surfacesWithEdges: number;
  readonly surfacesTotal: number;
}

export interface AnalysisResult {
  readonly format: 'prodara-analysis';
  readonly version: '0.1.0';
  readonly consistency: readonly ConsistencyCheck[];
  readonly coverage: CoverageReport;
}

export interface AnalysisOptions {
  readonly couplingThreshold: number;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export function analyzeGraph(graph: ProductGraph, options: AnalysisOptions): AnalysisResult {
  const checks: ConsistencyCheck[] = [];

  // Collect all node IDs with their metadata
  const allNodeIds = new Set<string>();
  const entityIds: string[] = [];
  const workflowIds: string[] = [];
  const surfaceIds: string[] = [];
  const eventIds: string[] = [];
  const nodeModuleMap = new Map<string, string>();

  for (const mod of graph.modules) {
    allNodeIds.add(mod.id);
    nodeModuleMap.set(mod.id, mod.name);

    for (const [key, value] of Object.entries(mod)) {
      if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'id' in item && 'kind' in item) {
            const nodeId = item.id as string;
            const kind = item.kind as string;
            allNodeIds.add(nodeId);
            nodeModuleMap.set(nodeId, mod.name);
            if (kind === 'entity') entityIds.push(nodeId);
            if (kind === 'workflow' || kind === 'action') workflowIds.push(nodeId);
            if (kind === 'surface') surfaceIds.push(nodeId);
            if (kind === 'event') eventIds.push(nodeId);
          }
        }
      }
    }
  }

  // Build edge indexes
  const inboundCount = new Map<string, number>();
  const testedNodes = new Set<string>();
  const authorizedNodes = new Set<string>();
  const eventConsumers = new Set<string>();
  const crossModuleEdges = new Map<string, number>();

  for (const edge of graph.edges) {
    inboundCount.set(edge.to, (inboundCount.get(edge.to) ?? 0) + 1);

    if (edge.kind === 'tests') testedNodes.add(edge.to);
    if (edge.kind === 'authorized_as' || edge.kind === 'governs') authorizedNodes.add(edge.from);
    if (edge.kind === 'consumes_event') eventConsumers.add(edge.to);

    // Check cross-module coupling
    const fromMod = nodeModuleMap.get(edge.from);
    const toMod = nodeModuleMap.get(edge.to);
    if (fromMod && toMod && fromMod !== toMod) {
      const key = `${fromMod}->${toMod}`;
      crossModuleEdges.set(key, (crossModuleEdges.get(key) ?? 0) + 1);
    }
  }

  // 1. Orphan nodes — nodes with no inbound edges (excluding product/module roots)
  for (const nodeId of allNodeIds) {
    /* v8 ignore next -- product node is always present and skipped */
    if (nodeId === 'product') continue;
    if (graph.modules.some(m => m.id === nodeId)) continue;
    const inbound = inboundCount.get(nodeId) ?? 0;
    // Also check if it's referenced as edge source (it produces outbound but has no inbound)
    const hasOutbound = graph.edges.some(e => e.from === nodeId);
    if (inbound === 0 && !hasOutbound) {
      checks.push({
        kind: 'orphan_node',
        severity: 'warning',
        message: `Node "${nodeId}" has no inbound or outbound edges — it may be orphaned`,
        nodeIds: [nodeId],
      });
    }
  }

  // 2. Missing test coverage
  for (const entityId of entityIds) {
    if (!testedNodes.has(entityId)) {
      checks.push({
        kind: 'missing_test_coverage',
        severity: 'info',
        message: `Entity "${entityId}" has no test coverage`,
        nodeIds: [entityId],
      });
    }
  }

  // 3. Missing authorization
  for (const wfId of workflowIds) {
    if (!authorizedNodes.has(wfId)) {
      checks.push({
        kind: 'missing_authorization',
        severity: 'warning',
        message: `Workflow "${wfId}" has no authorization rules`,
        nodeIds: [wfId],
      });
    }
  }

  // 4. Unused events
  for (const eventId of eventIds) {
    if (!eventConsumers.has(eventId)) {
      checks.push({
        kind: 'unused_event',
        severity: 'info',
        message: `Event "${eventId}" has no consumers`,
        nodeIds: [eventId],
      });
    }
  }

  // 5. Cross-module coupling
  for (const [key, count] of crossModuleEdges) {
    if (count > options.couplingThreshold) {
      checks.push({
        kind: 'cross_module_coupling',
        severity: 'warning',
        message: `Coupling ${key}: ${count} cross-module edges (threshold: ${options.couplingThreshold})`,
        nodeIds: [],
      });
    }
  }

  // 6. Surface completeness
  for (const surfaceId of surfaceIds) {
    const hasEdges = graph.edges.some(e => e.from === surfaceId);
    if (!hasEdges) {
      checks.push({
        kind: 'surface_incomplete',
        severity: 'info',
        message: `Surface "${surfaceId}" has no outbound relationships`,
        nodeIds: [surfaceId],
      });
    }
  }

  // Build coverage report
  const coverage: CoverageReport = {
    entitiesWithTests: entityIds.filter(id => testedNodes.has(id)).length,
    entitiesTotal: entityIds.length,
    workflowsWithAuth: workflowIds.filter(id => authorizedNodes.has(id)).length,
    workflowsTotal: workflowIds.length,
    surfacesWithEdges: surfaceIds.filter(id => graph.edges.some(e => e.from === id)).length,
    surfacesTotal: surfaceIds.length,
  };

  return {
    format: 'prodara-analysis',
    version: '0.1.0',
    consistency: checks,
    coverage,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatAnalysisHuman(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('Cross-Artifact Analysis');
  lines.push('');

  // Coverage summary
  lines.push('## Coverage');
  lines.push('');
  const { coverage: cov } = result;
  lines.push(`  Entities with tests:    ${cov.entitiesWithTests}/${cov.entitiesTotal}`);
  lines.push(`  Workflows with auth:    ${cov.workflowsWithAuth}/${cov.workflowsTotal}`);
  lines.push(`  Surfaces with edges:    ${cov.surfacesWithEdges}/${cov.surfacesTotal}`);
  lines.push('');

  // Consistency findings
  if (result.consistency.length === 0) {
    lines.push('No consistency issues found.');
  } else {
    lines.push(`## Findings (${result.consistency.length})`);
    lines.push('');
    for (const check of result.consistency) {
      /* v8 ignore next -- severity ternary */
      const icon = check.severity === 'error' ? '✗' : check.severity === 'warning' ? '⚠' : 'ℹ';
      lines.push(`  ${icon} [${check.kind}] ${check.message}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
