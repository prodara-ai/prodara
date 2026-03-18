// ---------------------------------------------------------------------------
// Prodara CLI — Interactive Dashboard
// ---------------------------------------------------------------------------
// A simple text-based dashboard showing project overview, build status,
// active proposals, and quick stats. Unlike a full TUI (ink), this renders
// a snapshot and exits — no external dependencies required.

import type { ProductGraph } from '../graph/graph-types.js';
import type { CompileResult } from './compile.js';
import { listProposals } from '../proposal/proposal.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardData {
  readonly productName: string;
  readonly moduleCount: number;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly lastBuildStatus: 'success' | 'error' | 'none';
  readonly diagnosticCount: number;
  readonly activeProposals: number;
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

/**
 * Collect dashboard data from a compile result and root directory.
 */
export function collectDashboardData(root: string, result: CompileResult): DashboardData {
  const graph = result.graph;
  let nodeCount = 0;
  if (graph) {
    for (const mod of graph.modules) {
      for (const [key, value] of Object.entries(mod)) {
        if (key === 'id' || key === 'kind' || key === 'name' || key === 'imports') continue;
        if (Array.isArray(value)) nodeCount += value.length;
      }
    }
  }

  const proposals = listProposals(root);

  return {
    productName: graph?.product.name ?? 'unknown',
    moduleCount: graph?.modules.length ?? 0,
    nodeCount,
    edgeCount: graph?.edges.length ?? 0,
    lastBuildStatus: result.diagnostics.all.length > 0 ? 'error' : graph ? 'success' : 'none',
    diagnosticCount: result.diagnostics.all.length,
    activeProposals: proposals.length,
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render dashboard data as a formatted text panel.
 */
export function formatDashboard(data: DashboardData): string {
  const lines: string[] = [];
  const bar = '━'.repeat(52);

  lines.push(`┏${bar}┓`);
  lines.push(`┃  Prodara Dashboard${' '.repeat(33)}┃`);
  lines.push(`┣${bar}┫`);
  lines.push(`┃  Product: ${data.productName.padEnd(40)}┃`);
  lines.push(`┃  Modules: ${String(data.moduleCount).padEnd(40)}┃`);
  lines.push(`┃  Nodes:   ${String(data.nodeCount).padEnd(40)}┃`);
  lines.push(`┃  Edges:   ${String(data.edgeCount).padEnd(40)}┃`);
  lines.push(`┣${bar}┫`);

  const statusIcon = data.lastBuildStatus === 'success' ? '✓'
    /* v8 ignore next -- error status icon */
    : data.lastBuildStatus === 'error' ? '✗' : '—';
  const statusText = `${statusIcon} Build: ${data.lastBuildStatus}`;
  lines.push(`┃  ${statusText.padEnd(49)}┃`);

  if (data.diagnosticCount > 0) {
    lines.push(`┃  Diagnostics: ${String(data.diagnosticCount).padEnd(36)}┃`);
  }

  lines.push(`┃  Active proposals: ${String(data.activeProposals).padEnd(31)}┃`);
  lines.push(`┣${bar}┫`);
  lines.push(`┃  Quick Commands:${' '.repeat(34)}┃`);
  lines.push(`┃    prodara build      — full build${' '.repeat(16)}┃`);
  lines.push(`┃    prodara validate   — check specs${' '.repeat(15)}┃`);
  lines.push(`┃    prodara drift      — detect drift${' '.repeat(14)}┃`);
  lines.push(`┃    prodara changes    — list proposals${' '.repeat(12)}┃`);
  lines.push(`┗${bar}┛`);

  return lines.join('\n');
}
