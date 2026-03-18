import { describe, it, expect } from 'vitest';
import { sliceGraph, sliceAllCategories } from '../src/generator/contracts.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';
import type { SliceCategory } from '../src/generator/contracts.js';

function makeGraph(
  moduleItems: Record<string, { id: string; kind: string; name: string }[]>,
  edges: { from: string; to: string; kind: string }[],
): ProductGraph {
  const modules: ModuleNode[] = Object.entries(moduleItems).map(([modName, items]) => {
    const mod: Record<string, unknown> = { id: modName, kind: 'module', name: modName, imports: [] };
    // Group items by plural kind
    for (const item of items) {
      const cat = item.kind + 's';
      if (!mod[cat]) mod[cat] = [];
      (mod[cat] as unknown[]).push(item);
    }
    return mod as unknown as ModuleNode;
  });

  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: { id: 'product', kind: 'product', name: 'test', title: null, version: null, modules: Object.keys(moduleItems), publishes: null },
    modules,
    edges: edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind as 'contains' })),
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };
}

describe('Generator contracts', () => {
  describe('sliceGraph — category-based', () => {
    it('slices backend nodes (workflows, actions, events)', () => {
      const graph = makeGraph({
        core: [
          { id: 'core.workflow.create_task', kind: 'workflow', name: 'create_task' },
          { id: 'core.entity.task', kind: 'entity', name: 'task' },
          { id: 'core.action.do_create', kind: 'action', name: 'do_create' },
        ],
      }, [
        { from: 'core.workflow.create_task', to: 'core.entity.task', kind: 'writes' },
        { from: 'core.action.do_create', to: 'core.workflow.create_task', kind: 'invokes' },
      ]);

      const slice = sliceGraph(graph, 'backend');
      expect(slice.category).toBe('backend');
      expect(slice.rootNodeIds).toContain('core.workflow.create_task');
      expect(slice.rootNodeIds).toContain('core.action.do_create');
      // Should include the entity via transitive dependency
      expect(slice.nodeIds).toContain('core.entity.task');
    });

    it('slices frontend nodes (surfaces, rendering, tokens)', () => {
      const graph = makeGraph({
        ui: [
          { id: 'ui.surface.dashboard', kind: 'surface', name: 'dashboard' },
          { id: 'ui.tokens.base', kind: 'token', name: 'base' },
        ],
      }, []);

      const slice = sliceGraph(graph, 'frontend');
      expect(slice.rootNodeIds).toContain('ui.surface.dashboard');
    });

    it('slices schema nodes (entities, values, enums)', () => {
      const graph = makeGraph({
        domain: [
          { id: 'domain.entity.user', kind: 'entity', name: 'user' },
          { id: 'domain.value.address', kind: 'value', name: 'address' },
          { id: 'domain.enum.status', kind: 'enum', name: 'status' },
        ],
      }, [
        { from: 'domain.entity.user', to: 'domain.value.address', kind: 'field_type' },
      ]);

      const slice = sliceGraph(graph, 'schema');
      expect(slice.rootNodeIds).toHaveLength(3);
      expect(slice.edges).toHaveLength(1);
    });

    it('slices runtime nodes (secrets, environments, deployments)', () => {
      const graph = makeGraph({
        infra: [
          { id: 'infra.secret.db_pass', kind: 'secret', name: 'db_pass' },
          { id: 'infra.environment.staging', kind: 'environment', name: 'staging' },
          { id: 'infra.deployment.main', kind: 'deployment', name: 'main' },
        ],
      }, [
        { from: 'infra.deployment.main', to: 'infra.environment.staging', kind: 'includes_env' },
        { from: 'infra.environment.staging', to: 'infra.secret.db_pass', kind: 'binds_secret' },
      ]);

      const slice = sliceGraph(graph, 'runtime');
      expect(slice.rootNodeIds).toHaveLength(3);
      expect(slice.nodeIds).toHaveLength(3);
      expect(slice.edges).toHaveLength(2);
    });

    it('slices api nodes (transport, integration)', () => {
      const graph = makeGraph({
        platform: [
          { id: 'platform.transport.api', kind: 'transport', name: 'api' },
          { id: 'platform.integration.stripe', kind: 'integration', name: 'stripe' },
        ],
      }, []);

      const slice = sliceGraph(graph, 'api');
      expect(slice.rootNodeIds).toHaveLength(2);
    });

    it('slices test nodes', () => {
      const graph = makeGraph({
        tests: [
          { id: 'tests.test.create_task_test', kind: 'test', name: 'create_task_test' },
        ],
      }, []);

      const slice = sliceGraph(graph, 'test');
      expect(slice.rootNodeIds).toHaveLength(1);
    });

    it('includes governance nodes that govern slice nodes', () => {
      const graph = makeGraph({
        core: [
          { id: 'core.entity.user', kind: 'entity', name: 'user' },
          { id: 'core.security.user_sec', kind: 'security', name: 'user_sec' },
        ],
      }, [
        { from: 'core.security.user_sec', to: 'core.entity.user', kind: 'governs' },
      ]);

      const slice = sliceGraph(graph, 'schema');
      expect(slice.nodeIds).toContain('core.security.user_sec');
    });

    it('returns empty slice for category with no matching nodes', () => {
      const graph = makeGraph({
        core: [
          { id: 'core.entity.task', kind: 'entity', name: 'task' },
        ],
      }, []);

      const slice = sliceGraph(graph, 'test');
      expect(slice.rootNodeIds).toHaveLength(0);
      expect(slice.nodeIds).toHaveLength(0);
      expect(slice.edges).toHaveLength(0);
    });
  });

  describe('sliceAllCategories', () => {
    it('produces slices for all 6 categories', () => {
      const graph = makeGraph({ core: [] }, []);
      const slices = sliceAllCategories(graph);
      expect(slices).toHaveLength(6);
      const categories = slices.map((s) => s.category);
      expect(categories).toContain('backend');
      expect(categories).toContain('frontend');
      expect(categories).toContain('api');
      expect(categories).toContain('runtime');
      expect(categories).toContain('schema');
      expect(categories).toContain('test');
    });
  });
});
