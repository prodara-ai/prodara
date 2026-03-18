// ---------------------------------------------------------------------------
// Tests — Dashboard
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';
import { collectDashboardData, formatDashboard, type DashboardData } from '../src/cli/dashboard.js';

vi.mock('../src/proposal/proposal.js', () => ({
  listProposals: vi.fn().mockReturnValue([{ id: 'p1' }, { id: 'p2' }]),
}));

describe('collectDashboardData', () => {
  it('collects data from compile result with graph', () => {
    const graph = {
      product: { name: 'MyApp' },
      modules: [
        { id: 'core', kind: 'module', name: 'core', imports: [],
          entities: [{ id: 'e1', kind: 'entity' }],
          workflows: [{ id: 'w1', kind: 'workflow' }],
        },
      ],
      edges: [{ from: 'a', to: 'b', kind: 'field_type' }],
    };
    const result = { graph, diagnostics: { all: [] } };
    const data = collectDashboardData('/tmp', result as any);

    expect(data.productName).toBe('MyApp');
    expect(data.moduleCount).toBe(1);
    expect(data.nodeCount).toBe(2);
    expect(data.edgeCount).toBe(1);
    expect(data.lastBuildStatus).toBe('success');
    expect(data.diagnosticCount).toBe(0);
    expect(data.activeProposals).toBe(2);
  });

  it('reports error status when diagnostics present', () => {
    const graph = { product: { name: 'App' }, modules: [], edges: [] };
    const result = { graph, diagnostics: { all: [{ severity: 'error', message: 'fail' }] } };
    const data = collectDashboardData('/tmp', result as any);

    expect(data.lastBuildStatus).toBe('error');
    expect(data.diagnosticCount).toBe(1);
  });

  it('reports none status when no graph', () => {
    const result = { graph: null, diagnostics: { all: [] } };
    const data = collectDashboardData('/tmp', result as any);

    expect(data.lastBuildStatus).toBe('none');
    expect(data.productName).toBe('unknown');
    expect(data.moduleCount).toBe(0);
  });
});

describe('formatDashboard', () => {
  const sampleData: DashboardData = {
    productName: 'MyApp',
    moduleCount: 3,
    nodeCount: 42,
    edgeCount: 65,
    lastBuildStatus: 'success',
    diagnosticCount: 0,
    activeProposals: 2,
  };

  it('includes product name', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('MyApp');
  });

  it('includes module count', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('3');
  });

  it('includes node and edge counts', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('42');
    expect(output).toContain('65');
  });

  it('shows build status icon', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('✓');
    expect(output).toContain('success');
  });

  it('shows error status icon for failed build', () => {
    const errorData = { ...sampleData, lastBuildStatus: 'error' as const, diagnosticCount: 5 };
    const output = formatDashboard(errorData);
    expect(output).toContain('✗');
    expect(output).toContain('Diagnostics: 5');
  });

  it('shows active proposals', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('Active proposals: 2');
  });

  it('includes quick commands', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('prodara build');
    expect(output).toContain('prodara validate');
    expect(output).toContain('prodara drift');
    expect(output).toContain('prodara changes');
  });

  it('renders box drawing characters', () => {
    const output = formatDashboard(sampleData);
    expect(output).toContain('┏');
    expect(output).toContain('┗');
    expect(output).toContain('┣');
  });
});
