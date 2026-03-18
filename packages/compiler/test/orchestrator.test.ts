// ---------------------------------------------------------------------------
// Build Orchestrator tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { createBuildRun, createBuildSummary, formatBuildSummary } from '../src/orchestrator/orchestrator.js';
import type { BuildInput } from '../src/orchestrator/types.js';
import type { ProductGraph } from '../src/graph/graph-types.js';
import type { Plan } from '../src/planner/plan-types.js';
import type { SpecTestSuiteResult } from '../src/testing/test-runner.js';
import { DiagnosticBag } from '../src/diagnostics/diagnostic.js';

function makeInput(overrides: Partial<BuildInput> = {}): BuildInput {
  const graph: ProductGraph = {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: { id: 'product', kind: 'product', name: 'test', title: null, version: null, modules: ['core'], publishes: null },
    modules: [{
      id: 'core', kind: 'module', name: 'core', imports: [],
      entitys: [{ id: 'core.entity.task', kind: 'entity' }],
    } as unknown as ProductGraph['modules'][0]],
    edges: [{ from: 'core.entity.task', to: 'core', kind: 'contains' as const }],
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };

  const plan: Plan = {
    format: 'prodara-plan',
    version: '0.1.0',
    changes: [],
    impacts: [],
    tasks: [
      { taskId: 't1', nodeId: 'core.entity.task', action: 'generate', reason: 'new' },
    ],
  };

  const testResults: SpecTestSuiteResult = {
    totalPassed: 3,
    totalFailed: 0,
    results: [],
    bag: new DiagnosticBag(),
  };

  const constitutions = {
    bag: new DiagnosticBag(),
    packages: [],
    refs: [],
  };

  return {
    graph,
    plan,
    testResults,
    constitutions,
    fileCount: 2,
    errorCount: 0,
    warningCount: 0,
    ...overrides,
  };
}

describe('Build Orchestrator', () => {
  describe('createBuildRun', () => {
    it('creates a successful build run with correct counts', () => {
      const input = makeInput();
      const run = createBuildRun(input);

      expect(run.status).toBe('success');
      expect(run.compiler_version).toBe('0.1.0');
      expect(run.file_count).toBe(2);
      expect(run.error_count).toBe(0);
      expect(run.warning_count).toBe(0);
      expect(run.test_passed).toBe(3);
      expect(run.test_failed).toBe(0);
      expect(run.plan_task_count).toBe(1);
      expect(run.edge_count).toBe(1);
      expect(run.node_count).toBeGreaterThan(0);
      expect(run.phases_completed).toContain('discovery');
      expect(run.phases_completed).toContain('planning');
      expect(run.phases_completed).toContain('testing');
    });

    it('marks status as failed when errors exist', () => {
      const input = makeInput({ errorCount: 3 });
      const run = createBuildRun(input);

      expect(run.status).toBe('failed');
      expect(run.error_count).toBe(3);
      expect(run.phases_completed).not.toContain('planning');
    });

    it('marks status as partial when tests fail', () => {
      const input = makeInput({
        testResults: {
          totalPassed: 2,
          totalFailed: 1,
          results: [],
          bag: new DiagnosticBag(),
        },
      });
      const run = createBuildRun(input);

      expect(run.status).toBe('partial');
      expect(run.test_passed).toBe(2);
      expect(run.test_failed).toBe(1);
    });

    it('sets started_at and finished_at as ISO strings', () => {
      const run = createBuildRun(makeInput());
      expect(() => new Date(run.started_at)).not.toThrow();
      expect(() => new Date(run.finished_at)).not.toThrow();
    });
  });

  describe('createBuildSummary', () => {
    it('produces phases for a successful build', () => {
      const summary = createBuildSummary(makeInput());

      expect(summary.status).toBe('success');
      expect(summary.phases).toHaveLength(4);
      expect(summary.phases[0]!.name).toBe('Validate');
      expect(summary.phases[0]!.status).toBe('ok');
      expect(summary.phases[1]!.name).toBe('Graph');
      expect(summary.phases[1]!.status).toBe('ok');
      expect(summary.phases[2]!.name).toBe('Implement');
      expect(summary.phases[2]!.status).toBe('ok');
      expect(summary.phases[3]!.name).toBe('Test');
      expect(summary.phases[3]!.status).toBe('ok');
    });

    it('marks graph/implement/test as skipped when errors exist', () => {
      const summary = createBuildSummary(makeInput({ errorCount: 2 }));

      expect(summary.status).toBe('failed');
      expect(summary.phases[0]!.status).toBe('error');
      expect(summary.phases[1]!.status).toBe('skipped');
      expect(summary.phases[2]!.status).toBe('skipped');
      expect(summary.phases[3]!.status).toBe('skipped');
    });

    it('shows warning status in Validate phase with warnings', () => {
      const summary = createBuildSummary(makeInput({ warningCount: 2 }));
      expect(summary.phases[0]!.status).toBe('warn');
      expect(summary.phases[0]!.detail).toContain('2 warning');
    });

    it('shows test failure phase', () => {
      const summary = createBuildSummary(makeInput({
        testResults: {
          totalPassed: 1,
          totalFailed: 2,
          results: [],
          bag: new DiagnosticBag(),
        },
      }));
      expect(summary.phases[3]!.status).toBe('error');
      expect(summary.phases[3]!.detail).toContain('2 failed');
    });

    it('counts generate/regenerate/verify tasks correctly in detail', () => {
      const input = makeInput({
        plan: {
          format: 'prodara-plan',
          version: '0.1.0',
          changes: [],
          impacts: [],
          tasks: [
            { taskId: 't1', nodeId: 'n1', action: 'generate', reason: 'new' },
            { taskId: 't2', nodeId: 'n2', action: 'regenerate', reason: 'changed' },
            { taskId: 't3', nodeId: 'n3', action: 'verify', reason: 'unchanged' },
          ],
        },
      });
      const summary = createBuildSummary(input);
      expect(summary.phases[2]!.detail).toContain('1 new');
      expect(summary.phases[2]!.detail).toContain('1 changed');
      expect(summary.phases[2]!.detail).toContain('1 unchanged');
    });
  });

  describe('formatBuildSummary', () => {
    it('formats a successful build summary', () => {
      const summary = createBuildSummary(makeInput());
      const output = formatBuildSummary(summary, 'My Product');

      expect(output).toContain('Prodara Build — My Product');
      expect(output).toContain('✓ Validate');
      expect(output).toContain('✓ Graph');
      expect(output).toContain('✓ Implement');
      expect(output).toContain('✓ Test');
      expect(output).toContain('Build complete.');
    });

    it('formats a failed build summary', () => {
      const summary = createBuildSummary(makeInput({ errorCount: 1 }));
      const output = formatBuildSummary(summary, 'Broken');

      expect(output).toContain('✗ Validate');
      expect(output).toContain('○ Graph');
      expect(output).toContain('Build failed.');
    });

    it('formats a partial build summary with test failures', () => {
      const summary = createBuildSummary(makeInput({
        testResults: {
          totalPassed: 2,
          totalFailed: 1,
          results: [],
          bag: new DiagnosticBag(),
        },
      }));
      const output = formatBuildSummary(summary, 'Partial');

      expect(output).toContain('Build completed with test failures.');
    });

    it('shows warning icon for warn phase', () => {
      const summary = createBuildSummary(makeInput({ warningCount: 3 }));
      const output = formatBuildSummary(summary, 'Warned');

      expect(output).toContain('⚠ Validate');
    });
  });
});
