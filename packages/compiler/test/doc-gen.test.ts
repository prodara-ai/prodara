// ---------------------------------------------------------------------------
// Tests — Doc-Gen Module
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProductGraph, ModuleNode, GraphEdge } from '../src/graph/graph-types.js';
import type { ResolvedDocsConfig } from '../src/config/config.js';
import type {
  EntityNode, EnumNode, ValueNode, ActorNode, CapabilityNode,
  RuleNode, WorkflowNode, ActionNode, EventNode, ScheduleNode,
  SurfaceNode, RenderingNode, TokensNode, StorageNode,
  SecurityNode, PrivacyNode, TestNode, StringsNode,
} from '../src/doc-gen/doc-gen-types.js';
import {
  renderBanner, formatTypeRef, renderTable, humanize,
  toAnchor, section, getArrayProp, shortName,
} from '../src/doc-gen/format-helpers.js';
import { createStringResolver } from '../src/doc-gen/string-resolver.js';
import { createLinkResolver } from '../src/doc-gen/link-resolver.js';
import { renderEntityErDiagram, renderWorkflowFlowchart } from '../src/doc-gen/mermaid-renderers.js';
import { renderSurfaceAscii } from '../src/doc-gen/surface-ascii.js';
import {
  renderActorsSection, renderDomainSection, renderRulesSection,
  renderWorkflowsSection, renderActionsSection, renderEventsSection,
  renderSchedulesSection, renderSurfacesSection, renderDesignSection,
  renderStorageSection, renderGovernanceSection, renderTestsSection,
  type SectionContext,
} from '../src/doc-gen/section-renderers.js';
import { renderModuleDoc } from '../src/doc-gen/module-renderer.js';
import { renderProductOverview } from '../src/doc-gen/product-renderer.js';
import { generateDocs, writeDocs } from '../src/doc-gen/doc-renderer.js';

// ---------------------------------------------------------------------------
// Re-export barrel (doc-gen/index.ts) coverage
// ---------------------------------------------------------------------------
import '../src/doc-gen/index.js';

// Re-export barrel imports for sub-modules
import '../src/drift/index.js';
import '../src/extensions/index.js';
import '../src/presets/index.js';
import '../src/proposal/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntity(name: string, modId: string, fields: EntityNode['fields'] = []): EntityNode {
  return { id: `${modId}.${name}`, kind: 'entity', name, fields };
}

function makeEnum(name: string, modId: string, members: string[]): EnumNode {
  return { id: `${modId}.${name}`, kind: 'enum', name, members: members.map(m => ({ name: m })) };
}

function makeValue(name: string, modId: string, fields: ValueNode['fields'] = []): ValueNode {
  return { id: `${modId}.${name}`, kind: 'value', name, fields };
}

function makeActor(name: string, modId: string): ActorNode {
  return { id: `${modId}.${name}`, kind: 'actor', name, title: `${name} Title`, description: `${name} desc` };
}

function makeCapability(name: string, modId: string, actors: string[] = []): CapabilityNode {
  return { id: `${modId}.${name}`, kind: 'capability', name, title: null, description: `Cap ${name}`, actors };
}

function makeWorkflow(name: string, modId: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return {
    id: `${modId}.${name}`, kind: 'workflow', name,
    ...overrides,
  };
}

function makeAction(name: string, modId: string, workflow: string | null = null): ActionNode {
  return { id: `${modId}.${name}`, kind: 'action', name, title: 'Do action', workflow };
}

function makeEvent(name: string, modId: string): EventNode {
  return { id: `${modId}.${name}`, kind: 'event', name, payload: 'string', description: 'An event' };
}

function makeSchedule(name: string, modId: string): ScheduleNode {
  return { id: `${modId}.${name}`, kind: 'schedule', name, cron: '0 * * * *', description: 'Runs hourly' };
}

function makeSurface(name: string, modId: string, overrides: Partial<SurfaceNode> = {}): SurfaceNode {
  return { id: `${modId}.${name}`, kind: 'surface', name, surface_kind: 'view', title: null, binds: null, ...overrides };
}

function makeRendering(name: string, modId: string, overrides: Partial<RenderingNode> = {}): RenderingNode {
  return { id: `${modId}.${name}`, kind: 'rendering', name, target: null, platform: 'web', layout: null, ...overrides };
}

function makeTokens(name: string, modId: string): TokensNode {
  return {
    id: `${modId}.${name}`, kind: 'tokens', name,
    categories: [
      { name: 'colors', tokens: [{ name: 'primary', value: '#FF0000' }, { name: 'size', value: 16 }] },
    ],
  };
}

function makeStorage(name: string, modId: string, target: string | null = null): StorageNode {
  return { id: `${modId}.${name}`, kind: 'storage', name, target, model: 'postgres', table: 'items' };
}

function makeSecurity(name: string, modId: string): SecurityNode {
  return { id: `${modId}.${name}`, kind: 'security', name, applies_to: ['core.task'] };
}

function makePrivacy(name: string, modId: string): PrivacyNode {
  return { id: `${modId}.${name}`, kind: 'privacy', name, applies_to: ['core.user'], classification: 'pii', retention: '90d', exportable: 'yes', erasable: 'yes' };
}

function makeTest(name: string, modId: string): TestNode {
  return { id: `${modId}.${name}`, kind: 'test', name };
}

function makeStrings(name: string, modId: string, entries: Record<string, string>): StringsNode {
  return { id: `${modId}.strings.${name}`, kind: 'strings', name, entries };
}

function makeModule(name: string, overrides: Partial<ModuleNode> = {}): ModuleNode {
  return {
    id: name, kind: 'module', name, imports: [],
    ...overrides,
  } as ModuleNode;
}

function makeGraph(modules: ModuleNode[] = [], edges: GraphEdge[] = []): ProductGraph {
  return {
    product: { id: 'product', kind: 'product', name: 'test_app', version: '1.0', modules: modules.map(m => m.name), constitutions: [] },
    modules,
    edges,
  } as unknown as ProductGraph;
}

function makeCtx(mod: ModuleNode, edges: GraphEdge[] = []): SectionContext {
  return {
    mod,
    edges,
    resolveString: (ref: string | null) => ref,
    resolveLink: (nodeId: string) => `[${nodeId.split('.').pop()}](#ref)`,
  };
}

// ---------------------------------------------------------------------------
// format-helpers
// ---------------------------------------------------------------------------

describe('format-helpers', () => {
  describe('renderBanner', () => {
    it('returns auto-generated comment lines', () => {
      const lines = renderBanner('app.prd');
      expect(lines[0]).toContain('AUTO-GENERATED');
      expect(lines[1]).toContain('app.prd');
      expect(lines[1]).toContain('Compiled:');
      expect(lines[2]).toContain('Edit the .prd source');
      expect(lines[3]).toBe('');
    });
  });

  describe('formatTypeRef', () => {
    it('returns primitive types as-is', () => {
      expect(formatTypeRef('string')).toBe('string');
      expect(formatTypeRef('uuid')).toBe('uuid');
    });

    it('extracts last segment of a ref type', () => {
      expect(formatTypeRef({ ref: 'core.task' })).toBe('task');
    });

    it('handles ref without dot', () => {
      expect(formatTypeRef({ ref: 'task' })).toBe('task');
    });

    it('formats generic types recursively', () => {
      expect(formatTypeRef({ generic: 'optional', arg: 'string' })).toBe('optional<string>');
      expect(formatTypeRef({ generic: 'list', arg: { ref: 'core.item' } })).toBe('list<item>');
    });
  });

  describe('renderTable', () => {
    it('renders markdown table', () => {
      const rows = renderTable(['Name', 'Type'], [['id', 'uuid'], ['title', 'string']]);
      expect(rows[0]).toBe('| Name | Type |');
      expect(rows[1]).toBe('| --- | --- |');
      expect(rows[2]).toBe('| id | uuid |');
      expect(rows[3]).toBe('| title | string |');
    });
  });

  describe('humanize', () => {
    it('converts snake_case to Title Case', () => {
      expect(humanize('user_profile')).toBe('User Profile');
      expect(humanize('task')).toBe('Task');
    });
  });

  describe('toAnchor', () => {
    it('converts heading to anchor id', () => {
      expect(toAnchor('Domain Model')).toBe('domain-model');
      expect(toAnchor('Actors & Capabilities')).toBe('actors-capabilities');
    });
  });

  describe('section', () => {
    it('returns heading lines with default level 2', () => {
      const lines = section('My Section');
      expect(lines).toEqual(['', '## My Section', '']);
    });

    it('supports custom heading level', () => {
      const lines = section('Sub', 3);
      expect(lines).toEqual(['', '### Sub', '']);
    });
  });

  describe('getArrayProp', () => {
    it('returns array property from module', () => {
      const mod = makeModule('core', { entities: [makeEntity('task', 'core')] } as unknown as Partial<ModuleNode>);
      const result = getArrayProp<EntityNode>(mod, 'entities');
      expect(result).toHaveLength(1);
    });

    it('returns empty array for missing property', () => {
      const mod = makeModule('core');
      expect(getArrayProp(mod, 'entities')).toEqual([]);
    });

    it('returns empty array for non-array property', () => {
      const mod = makeModule('core');
      expect(getArrayProp(mod, 'name')).toEqual([]);
    });
  });

  describe('shortName', () => {
    it('extracts last segment of dotted id', () => {
      expect(shortName('core.task')).toBe('task');
      expect(shortName('board.board_strings.title')).toBe('title');
    });

    it('returns single-segment ids as-is', () => {
      expect(shortName('task')).toBe('task');
    });
  });
});

// ---------------------------------------------------------------------------
// string-resolver
// ---------------------------------------------------------------------------

describe('createStringResolver', () => {
  it('resolves three-part qualified refs', () => {
    const mod = makeModule('board', {
      strings: [makeStrings('board_strings', 'board', { title: 'My Board', description: 'A board' })],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const resolve = createStringResolver(graph);

    expect(resolve('board.board_strings.title')).toBe('My Board');
    expect(resolve('board.board_strings.description')).toBe('A board');
  });

  it('returns null for null input', () => {
    const resolve = createStringResolver(makeGraph([]));
    expect(resolve(null)).toBeNull();
  });

  it('returns raw ref for unresolvable paths', () => {
    const resolve = createStringResolver(makeGraph([]));
    expect(resolve('unknown.path.key')).toBe('unknown.path.key');
  });

  it('returns short refs as-is', () => {
    const resolve = createStringResolver(makeGraph([]));
    expect(resolve('hello')).toBe('hello');
  });

  it('resolves via altSetPath with module.strings.set_name prefix', () => {
    // altSetPath fires when direct setPath fails but `parts[0].strings.parts[1]`
    // matches a stored node.id key. This happens when parts[0] differs from mod.name.
    const customNode: StringsNode = {
      id: 'app.strings.labels', kind: 'strings', name: 'labels',
      entries: { ok: 'OK' },
    };
    // Module name is "other" but node.id starts with "app"
    const mod = makeModule('other', {
      strings: [customNode],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const resolve = createStringResolver(graph);
    // Stored keys: "app.strings.labels" (node.id) and "other.labels" (mod.name + node.name)
    // ref "app.labels.ok": setPath = "app.labels" → NOT stored, altSetPath = "app.strings.labels" → FOUND
    expect(resolve('app.labels.ok')).toBe('OK');
  });
});

// ---------------------------------------------------------------------------
// link-resolver
// ---------------------------------------------------------------------------

describe('createLinkResolver', () => {
  it('returns same-module anchor links', () => {
    const entity = makeEntity('task', 'core', [{ name: 'id', type: 'uuid' }]);
    const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const resolve = createLinkResolver(graph);

    const link = resolve('core.task', 'core');
    expect(link).toContain('task');
    expect(link).toContain('#');
    expect(link).not.toContain('.md');
  });

  it('returns cross-module links', () => {
    const entity = makeEntity('task', 'core', [{ name: 'id', type: 'uuid' }]);
    const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const resolve = createLinkResolver(graph);

    const link = resolve('core.task', 'other');
    expect(link).toContain('core.md');
    expect(link).toContain('task');
  });

  it('returns plain text for unknown node ids', () => {
    const resolve = createLinkResolver(makeGraph([]));
    const link = resolve('unknown.thing', 'core');
    expect(link).toBe('thing');
  });
});

// ---------------------------------------------------------------------------
// mermaid-renderers
// ---------------------------------------------------------------------------

describe('renderEntityErDiagram', () => {
  it('renders ER diagram for entities with fields', () => {
    const entity = makeEntity('task', 'core', [
      { name: 'id', type: 'uuid' },
      { name: 'title', type: 'string' },
    ]);
    const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
    const lines = renderEntityErDiagram(mod, []);

    expect(lines[0]).toBe('```mermaid');
    expect(lines[1]).toBe('erDiagram');
    expect(lines.some(l => l.includes('TASK'))).toBe(true);
    expect(lines.some(l => l.includes('uuid id'))).toBe(true);
    expect(lines[lines.length - 1]).toBe('```');
  });

  it('renders value objects', () => {
    const val = makeValue('address', 'core', [
      { name: 'street', type: 'string' },
      { name: 'city', type: 'string' },
    ]);
    const mod = makeModule('core', { values: [val] } as unknown as Partial<ModuleNode>);
    const lines = renderEntityErDiagram(mod, []);

    expect(lines.some(l => l.includes('ADDRESS'))).toBe(true);
    expect(lines.some(l => l.includes('string street'))).toBe(true);
  });

  it('renders enums as entities with members', () => {
    const en = makeEnum('status', 'core', ['active', 'inactive']);
    const mod = makeModule('core', { enums: [en] } as unknown as Partial<ModuleNode>);
    const lines = renderEntityErDiagram(mod, []);

    expect(lines.some(l => l.includes('STATUS'))).toBe(true);
    expect(lines.some(l => l.includes('enum active'))).toBe(true);
  });

  it('renders relationships from field_type edges', () => {
    const task = makeEntity('task', 'core', [
      { name: 'id', type: 'uuid' },
      { name: 'status', type: { ref: 'core.task_status' } },
    ]);
    const status = makeEnum('task_status', 'core', ['open', 'done']);
    const mod = makeModule('core', { entities: [task], enums: [status] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'core.task_status', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    expect(lines.some(l => l.includes('TASK') && l.includes('TASK_STATUS') && l.includes('references'))).toBe(true);
  });

  it('renders optional cardinality', () => {
    const task = makeEntity('task', 'core', [
      { name: 'assignee', type: { generic: 'optional', arg: { ref: 'core.user' } } },
    ]);
    const user = makeEntity('user', 'core', [{ name: 'id', type: 'uuid' }]);
    const mod = makeModule('core', { entities: [task, user] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'core.user', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    expect(lines.some(l => l.includes('||--o|'))).toBe(true);
  });

  it('renders list cardinality', () => {
    const task = makeEntity('task', 'core', [
      { name: 'tags', type: { generic: 'list', arg: { ref: 'core.tag' } } },
    ]);
    const tag = makeValue('tag', 'core', [{ name: 'name', type: 'string' }]);
    const mod = makeModule('core', { entities: [task], values: [tag] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'core.tag', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    expect(lines.some(l => l.includes('||--o{'))).toBe(true);
  });

  it('returns empty for module with no domain objects', () => {
    const mod = makeModule('empty');
    expect(renderEntityErDiagram(mod, [])).toEqual([]);
  });

  it('skips duplicate relationships', () => {
    const task = makeEntity('task', 'core', [
      { name: 'status', type: { ref: 'core.status_enum' } },
    ]);
    const en = makeEnum('status_enum', 'core', ['a', 'b']);
    const mod = makeModule('core', { entities: [task], enums: [en] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'core.status_enum', kind: 'field_type' } as unknown as GraphEdge,
      { from: 'core.task', to: 'core.status_enum', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    const refLines = lines.filter(l => l.includes('references'));
    expect(refLines).toHaveLength(1);
  });

  it('ignores cross-module field_type edges', () => {
    const task = makeEntity('task', 'core', [{ name: 'id', type: 'uuid' }]);
    const mod = makeModule('core', { entities: [task] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'other.thing', to: 'core.task', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    expect(lines.filter(l => l.includes('references'))).toHaveLength(0);
  });

  it('marks id fields as PK', () => {
    const entity = makeEntity('task', 'core', [
      { name: 'id', type: 'uuid' },
      { name: 'user_id', type: 'uuid' },
    ]);
    const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
    const lines = renderEntityErDiagram(mod, []);
    expect(lines.some(l => l.includes('PK'))).toBe(true);
  });

  it('skips relationship when edge target is not in module', () => {
    const task = makeEntity('task', 'core', [
      { name: 'id', type: 'uuid' },
      { name: 'owner', type: { ref: 'other.user' } },
    ]);
    const mod = makeModule('core', { entities: [task] } as unknown as Partial<ModuleNode>);
    // edge.from is in the module, but edge.to is NOT in entities/values/enums
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'other.external', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    // The edge should be skipped (toNode is null)
    expect(lines.filter(l => l.includes('references'))).toHaveLength(0);
  });

  it('falls back to default cardinality when field does not reference target', () => {
    const task = makeEntity('task', 'core', [
      { name: 'id', type: 'uuid' },
      { name: 'status', type: 'string' },
    ]);
    const label = makeEntity('label', 'core', [{ name: 'id', type: 'uuid' }]);
    const mod = makeModule('core', { entities: [task, label] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'core.label', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    // inferCardinality exhausts the field loop and falls back to ||--||
    expect(lines.some(l => l.includes('||--||') && l.includes('references'))).toBe(true);
  });

  it('matches reference by short name via endsWith', () => {
    // Field ref is 'user' (short), target entity id is 'core.user'
    const task = makeEntity('task', 'core', [
      { name: 'id', type: 'uuid' },
      { name: 'assignee', type: { ref: 'user' } },
    ]);
    const user = makeEntity('user', 'core', [{ name: 'id', type: 'uuid' }]);
    const mod = makeModule('core', { entities: [task, user] } as unknown as Partial<ModuleNode>);
    const edges: GraphEdge[] = [
      { from: 'core.task', to: 'core.user', kind: 'field_type' } as unknown as GraphEdge,
    ];
    const lines = renderEntityErDiagram(mod, edges);
    expect(lines.some(l => l.includes('references'))).toBe(true);
  });
});

describe('renderWorkflowFlowchart', () => {
  it('renders flowchart for workflow with call steps', () => {
    const wf = makeWorkflow('create_task', 'core', {
      steps: [{ call: 'validate_input' }, { call: 'save_task' }],
    });
    const lines = renderWorkflowFlowchart(wf);

    expect(lines[0]).toBe('```mermaid');
    expect(lines[1]).toBe('flowchart TD');
    expect(lines.some(l => l.includes('create_task'))).toBe(true);
    expect(lines.some(l => l.includes('validate_input'))).toBe(true);
    expect(lines.some(l => l.includes('save_task'))).toBe(true);
  });

  it('renders fail steps', () => {
    const wf = makeWorkflow('fail_wf', 'core', {
      steps: [{ fail: 'unauthorized' }],
    });
    const lines = renderWorkflowFlowchart(wf);
    expect(lines.some(l => l.includes('unauthorized'))).toBe(true);
  });

  it('renders decide steps with branches', () => {
    const wf = makeWorkflow('decide_wf', 'core', {
      steps: [{
        decide: 'is_valid',
        branches: [
          { when: 'yes', action: { call: 'proceed' } },
          { when: 'no', action: { fail: 'invalid' } },
        ],
      }],
    });
    const lines = renderWorkflowFlowchart(wf);
    expect(lines.some(l => l.includes('is_valid'))).toBe(true);
    expect(lines.some(l => l.includes('yes'))).toBe(true);
    expect(lines.some(l => l.includes('proceed'))).toBe(true);
    expect(lines.some(l => l.includes('invalid'))).toBe(true);
  });

  it('renders effects', () => {
    const wf = makeWorkflow('wf_effects', 'core', {
      steps: [{ call: 'do_thing' }],
      effects: [{ emit: 'task_created' }],
    });
    const lines = renderWorkflowFlowchart(wf);
    expect(lines.some(l => l.includes('emit') && l.includes('task_created'))).toBe(true);
  });

  it('returns empty for workflow with no steps', () => {
    const wf = makeWorkflow('empty_wf', 'core');
    expect(renderWorkflowFlowchart(wf)).toEqual([]);
  });

  it('connects decide branches to next step', () => {
    const wf = makeWorkflow('multi_step', 'core', {
      steps: [
        { decide: 'check', branches: [{ when: 'ok', action: { call: 'act' } }] },
        { call: 'finalize' },
      ],
    });
    const lines = renderWorkflowFlowchart(wf);
    expect(lines.some(l => l.includes('S1'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// surface-ascii
// ---------------------------------------------------------------------------

describe('renderSurfaceAscii', () => {
  it('renders simple box for view surface', () => {
    const surface = makeSurface('task_list', 'core', { surface_kind: 'list', title: null });
    const lines = renderSurfaceAscii(surface, null, () => null, ['create', 'edit']);

    expect(lines[0]).toBe('```');
    expect(lines[lines.length - 1]).toBe('```');
    expect(lines.some(l => l.includes('Task List'))).toBe(true);
    expect(lines.some(l => l.includes('create'))).toBe(true);
  });

  it('renders grid box when rendering has grid layout', () => {
    const surface = makeSurface('dashboard', 'core', { surface_kind: 'dashboard' });
    const rendering = makeRendering('dash_render', 'core', { layout: 'grid', target: 'core.dashboard' });
    const lines = renderSurfaceAscii(surface, rendering, () => null, []);

    expect(lines.some(l => l.includes('grid'))).toBe(true);
    expect(lines.some(l => l.includes('Dashboard'))).toBe(true);
  });

  it('renders grid box with null platform and binds', () => {
    const surface = makeSurface('board', 'core', { surface_kind: 'dashboard', binds: 'core.task' });
    const rendering = makeRendering('r', 'core', { layout: 'grid', platform: null as unknown as string });
    const lines = renderSurfaceAscii(surface, rendering, () => null, []);

    expect(lines.some(l => l.includes('web'))).toBe(true); // falls back to 'web'
    expect(lines.some(l => l.includes('Binds: task'))).toBe(true);
  });

  it('renders simple box without actions and without binds', () => {
    const surface = makeSurface('empty_view', 'core', { surface_kind: 'view', binds: null });
    const lines = renderSurfaceAscii(surface, null, () => null, []);

    expect(lines.some(l => l.includes('Kind: view'))).toBe(true);
    expect(lines.some(l => l.includes('Binds:'))).toBe(false);
  });

  it('shows binds entity', () => {
    const surface = makeSurface('task_form', 'core', { binds: 'core.task', surface_kind: 'form' });
    const lines = renderSurfaceAscii(surface, null, () => null, []);

    expect(lines.some(l => l.includes('Binds: task'))).toBe(true);
  });

  it('resolves title from string reference', () => {
    const surface = makeSurface('my_view', 'core', { title: 'board.strings.title' });
    const resolve = (ref: string | null) => ref === 'board.strings.title' ? 'My Board' : null;
    const lines = renderSurfaceAscii(surface, null, resolve, []);

    expect(lines.some(l => l.includes('My Board'))).toBe(true);
  });

  it('uses icon based on surface kind', () => {
    for (const kind of ['view', 'form', 'dashboard', 'api', 'modal', 'list'] as const) {
      const surface = makeSurface('s', 'core', { surface_kind: kind });
      const lines = renderSurfaceAscii(surface, null, () => null, []);
      // Should contain an emoji icon
      expect(lines.some(l => /[📋📝📊🔌💬📃]/.test(l))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// section-renderers
// ---------------------------------------------------------------------------

describe('section-renderers', () => {
  describe('renderActorsSection', () => {
    it('renders actors and capabilities', () => {
      const mod = makeModule('core', {
        actors: [makeActor('admin', 'core')],
        capabilities: [makeCapability('manage_tasks', 'core', ['core.admin'])],
      } as unknown as Partial<ModuleNode>);
      const lines = renderActorsSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Actors & Capabilities'))).toBe(true);
      expect(lines.some(l => l.includes('Admin'))).toBe(true);
      expect(lines.some(l => l.includes('Manage Tasks'))).toBe(true);
    });

    it('returns empty for modules without actors', () => {
      expect(renderActorsSection(makeCtx(makeModule('core')))).toEqual([]);
    });

    it('renders actor without description (falls back to title or dash)', () => {
      const actor: ActorNode = { id: 'core.bot', kind: 'actor', name: 'bot', description: undefined as unknown as string, title: 'Bot Agent' };
      const mod = makeModule('core', { actors: [actor] } as unknown as Partial<ModuleNode>);
      const lines = renderActorsSection(makeCtx(mod));
      expect(lines.some(l => l.includes('Bot Agent'))).toBe(true);
    });

    it('renders actor without description or title (dash fallback)', () => {
      const actor: ActorNode = { id: 'core.sys', kind: 'actor', name: 'system', description: undefined as unknown as string, title: undefined as unknown as string };
      const mod = makeModule('core', { actors: [actor] } as unknown as Partial<ModuleNode>);
      const lines = renderActorsSection(makeCtx(mod));
      expect(lines.some(l => l.includes('—'))).toBe(true);
    });

    it('renders capability without description (title fallback)', () => {
      const cap: CapabilityNode = { id: 'core.c', kind: 'capability', name: 'manage', title: 'Manage Items', description: undefined as unknown as string, actors: [] };
      const mod = makeModule('core', { capabilities: [cap] } as unknown as Partial<ModuleNode>);
      const lines = renderActorsSection(makeCtx(mod));
      expect(lines.some(l => l.includes('Manage Items'))).toBe(true);
      expect(lines.some(l => l.includes('—'))).toBe(true); // empty actors → '—'
    });
  });

  describe('renderDomainSection', () => {
    it('renders entities with fields and ER diagram', () => {
      const entity = makeEntity('task', 'core', [
        { name: 'id', type: 'uuid' },
        { name: 'title', type: 'string' },
      ]);
      const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
      const lines = renderDomainSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Domain Model'))).toBe(true);
      expect(lines.some(l => l.includes('Entity: Task'))).toBe(true);
      expect(lines.some(l => l.includes('erDiagram'))).toBe(true);
    });

    it('renders enums with members', () => {
      const en = makeEnum('status', 'core', ['open', 'closed']);
      const mod = makeModule('core', { enums: [en] } as unknown as Partial<ModuleNode>);
      const lines = renderDomainSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Enum: Status'))).toBe(true);
      expect(lines.some(l => l.includes('`open`'))).toBe(true);
    });

    it('renders value objects', () => {
      const val = makeValue('address', 'core', [{ name: 'street', type: 'string' }]);
      const mod = makeModule('core', { values: [val] } as unknown as Partial<ModuleNode>);
      const lines = renderDomainSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Value: Address'))).toBe(true);
    });

    it('formats ref type with link', () => {
      const entity = makeEntity('task', 'core', [
        { name: 'user', type: { ref: 'core.user' } },
      ]);
      const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
      const ctx = makeCtx(mod);
      const lines = renderDomainSection(ctx);

      expect(lines.some(l => l.includes('#ref'))).toBe(true);
    });

    it('formats generic types', () => {
      const entity = makeEntity('task', 'core', [
        { name: 'tags', type: { generic: 'list', arg: 'string' } },
      ]);
      const mod = makeModule('core', { entities: [entity] } as unknown as Partial<ModuleNode>);
      const lines = renderDomainSection(makeCtx(mod));

      expect(lines.some(l => l.includes('list<string>'))).toBe(true);
    });

    it('returns empty for modules without domain objects', () => {
      expect(renderDomainSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderRulesSection', () => {
    it('renders business rules', () => {
      const rule: RuleNode = { id: 'core.r1', kind: 'rule', name: 'must_have_title', entity: 'core.task', condition: {}, message: 'Title required' };
      const mod = makeModule('core', { rules: [rule] } as unknown as Partial<ModuleNode>);
      const lines = renderRulesSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Business Rules'))).toBe(true);
      expect(lines.some(l => l.includes('Must Have Title'))).toBe(true);
    });

    it('returns empty for modules without rules', () => {
      expect(renderRulesSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderWorkflowsSection', () => {
    it('renders workflows with authorization and steps', () => {
      const wf = makeWorkflow('create_task', 'core', {
        authorization: [{ actor: 'core.admin', permissions: ['write'] }],
        input: [{ name: 'title', type: 'string' }],
        reads: ['core.task'],
        writes: ['core.task'],
        steps: [{ call: 'save' }],
        transitions: [{ entity: 'core.task', field: 'status', from: 'draft', to: 'active' }],
        effects: [{ emit: 'task_created' }],
        returns: [{ name: 'success', type: 'boolean' }],
      });
      const mod = makeModule('core', { workflows: [wf] } as unknown as Partial<ModuleNode>);
      const lines = renderWorkflowsSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Workflows'))).toBe(true);
      expect(lines.some(l => l.includes('Authorization'))).toBe(true);
      expect(lines.some(l => l.includes('write'))).toBe(true);
      expect(lines.some(l => l.includes('Input'))).toBe(true);
      expect(lines.some(l => l.includes('Reads'))).toBe(true);
      expect(lines.some(l => l.includes('Writes'))).toBe(true);
      expect(lines.some(l => l.includes('Transitions'))).toBe(true);
      expect(lines.some(l => l.includes('draft → active'))).toBe(true);
      expect(lines.some(l => l.includes('Effects'))).toBe(true);
      expect(lines.some(l => l.includes('Returns'))).toBe(true);
    });

    it('renders minimal workflow', () => {
      const wf = makeWorkflow('simple', 'core');
      const mod = makeModule('core', { workflows: [wf] } as unknown as Partial<ModuleNode>);
      const lines = renderWorkflowsSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Simple'))).toBe(true);
    });

    it('renders workflow with generic type in returns', () => {
      const wf = makeWorkflow('fetch', 'core', {
        returns: [{ name: 'result', type: { generic: 'optional', arg: 'string' } }],
      });
      const mod = makeModule('core', { workflows: [wf] } as unknown as Partial<ModuleNode>);
      const lines = renderWorkflowsSection(makeCtx(mod));
      expect(lines.some(l => l.includes('optional<string>'))).toBe(true);
    });

    it('returns empty for modules without workflows', () => {
      expect(renderWorkflowsSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderActionsSection', () => {
    it('renders actions table', () => {
      const action = makeAction('create_task', 'core', 'core.create_wf');
      const mod = makeModule('core', { actions: [action] } as unknown as Partial<ModuleNode>);
      const lines = renderActionsSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Actions'))).toBe(true);
      expect(lines.some(l => l.includes('Create Task'))).toBe(true);
    });

    it('renders action without workflow and without title', () => {
      const action: ActionNode = { id: 'core.a', kind: 'action', name: 'do_nothing', title: null as unknown as string, workflow: null };
      const mod = makeModule('core', { actions: [action] } as unknown as Partial<ModuleNode>);
      const lines = renderActionsSection(makeCtx(mod));
      expect(lines.some(l => l.includes('—'))).toBe(true);
    });

    it('returns empty for modules without actions', () => {
      expect(renderActionsSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderEventsSection', () => {
    it('renders events table', () => {
      const event = makeEvent('task_created', 'core');
      const mod = makeModule('core', { events: [event] } as unknown as Partial<ModuleNode>);
      const lines = renderEventsSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Events'))).toBe(true);
      expect(lines.some(l => l.includes('Task Created'))).toBe(true);
    });

    it('handles event without payload', () => {
      const event: EventNode = { id: 'core.e', kind: 'event', name: 'simple', payload: null, description: null };
      const mod = makeModule('core', { events: [event] } as unknown as Partial<ModuleNode>);
      const lines = renderEventsSection(makeCtx(mod));
      expect(lines.some(l => l.includes('—'))).toBe(true);
    });

    it('returns empty for modules without events', () => {
      expect(renderEventsSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderSchedulesSection', () => {
    it('renders schedules table', () => {
      const schedule = makeSchedule('daily_sync', 'core');
      const mod = makeModule('core', { schedules: [schedule] } as unknown as Partial<ModuleNode>);
      const lines = renderSchedulesSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Schedules'))).toBe(true);
      expect(lines.some(l => l.includes('Daily Sync'))).toBe(true);
      expect(lines.some(l => l.includes('0 * * * *'))).toBe(true);
    });

    it('handles schedule without cron', () => {
      const schedule: ScheduleNode = { id: 'core.s', kind: 'schedule', name: 'manual', cron: null, description: null };
      const mod = makeModule('core', { schedules: [schedule] } as unknown as Partial<ModuleNode>);
      const lines = renderSchedulesSection(makeCtx(mod));
      expect(lines.some(l => l.includes('—'))).toBe(true);
    });

    it('returns empty for modules without schedules', () => {
      expect(renderSchedulesSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderSurfacesSection', () => {
    it('renders surfaces with ASCII art', () => {
      const surface = makeSurface('task_list', 'core');
      const mod = makeModule('core', { surfaces: [surface] } as unknown as Partial<ModuleNode>);
      const lines = renderSurfacesSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Surfaces'))).toBe(true);
      expect(lines.some(l => l.includes('Task List'))).toBe(true);
    });

    it('renders standalone renderings', () => {
      const rendering = makeRendering('mobile_layout', 'core', { platform: 'mobile', layout: 'stack' });
      const mod = makeModule('core', { renderings: [rendering] } as unknown as Partial<ModuleNode>);
      const lines = renderSurfacesSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Rendering: Mobile Layout'))).toBe(true);
      expect(lines.some(l => l.includes('mobile'))).toBe(true);
    });

    it('matches rendering to surface by target', () => {
      const surface = makeSurface('dashboard', 'core');
      const rendering = makeRendering('dash_r', 'core', { target: 'core.dashboard', layout: 'grid' });
      const mod = makeModule('core', {
        surfaces: [surface],
        renderings: [rendering],
      } as unknown as Partial<ModuleNode>);
      const lines = renderSurfacesSection(makeCtx(mod));
      expect(lines.some(l => l.includes('grid'))).toBe(true);
    });

    it('renders rendering with target link', () => {
      const rendering = makeRendering('r', 'core', { target: 'core.task_view', layout: null });
      const mod = makeModule('core', { renderings: [rendering] } as unknown as Partial<ModuleNode>);
      const lines = renderSurfacesSection(makeCtx(mod));
      expect(lines.some(l => l.includes('Target'))).toBe(true);
    });

    it('renders standalone rendering without target (null platform and layout)', () => {
      const rendering = makeRendering('simple', 'core', { target: null, platform: null as unknown as string, layout: null });
      const mod = makeModule('core', { renderings: [rendering] } as unknown as Partial<ModuleNode>);
      const lines = renderSurfacesSection(makeCtx(mod));
      expect(lines.some(l => l.includes('—'))).toBe(true); // null platform/layout → '—'
      expect(lines.some(l => l.includes('Target'))).toBe(false); // no target link
    });

    it('returns empty for modules without surfaces', () => {
      expect(renderSurfacesSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderDesignSection', () => {
    it('renders token categories with values', () => {
      const tokens = makeTokens('design_tokens', 'core');
      const mod = makeModule('core', { tokens: [tokens] } as unknown as Partial<ModuleNode>);
      const lines = renderDesignSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Design System'))).toBe(true);
      expect(lines.some(l => l.includes('Colors'))).toBe(true);
      expect(lines.some(l => l.includes('#FF0000'))).toBe(true);
      expect(lines.some(l => l.includes('🎨'))).toBe(true);
    });

    it('renders number token values', () => {
      const tokens: TokensNode = {
        id: 'core.spacing', kind: 'tokens', name: 'spacing',
        categories: [{ name: 'sizes', tokens: [{ name: 'sm', value: 8 }, { name: 'lg', value: 24 }] }],
      };
      const mod = makeModule('core', { tokens: [tokens] } as unknown as Partial<ModuleNode>);
      const lines = renderDesignSection(makeCtx(mod));
      expect(lines.some(l => l.includes('`8`'))).toBe(true);
      expect(lines.some(l => l.includes('`24`'))).toBe(true);
    });

    it('renders object token values as JSON', () => {
      const tokens: TokensNode = {
        id: 'core.complex', kind: 'tokens', name: 'complex',
        categories: [{ name: 'misc', tokens: [{ name: 'shadow', value: { x: 0, y: 2, blur: 4 } }] }],
      };
      const mod = makeModule('core', { tokens: [tokens] } as unknown as Partial<ModuleNode>);
      const lines = renderDesignSection(makeCtx(mod));
      expect(lines.some(l => l.includes('{"x":0,"y":2,"blur":4}'))).toBe(true);
    });

    it('renders non-hex string token values without swatch', () => {
      const tokens: TokensNode = {
        id: 'core.fonts', kind: 'tokens', name: 'fonts',
        categories: [{ name: 'typography', tokens: [{ name: 'family', value: 'Inter' }] }],
      };
      const mod = makeModule('core', { tokens: [tokens] } as unknown as Partial<ModuleNode>);
      const lines = renderDesignSection(makeCtx(mod));
      expect(lines.some(l => l.includes('`Inter`'))).toBe(true);
      expect(lines.some(l => l.includes('🎨'))).toBe(false);
    });

    it('returns empty for modules without tokens', () => {
      expect(renderDesignSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderStorageSection', () => {
    it('renders storage table', () => {
      const storage = makeStorage('task_store', 'core', 'core.task');
      const mod = makeModule('core', { storages: [storage] } as unknown as Partial<ModuleNode>);
      const lines = renderStorageSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Storage'))).toBe(true);
      expect(lines.some(l => l.includes('Task Store'))).toBe(true);
      expect(lines.some(l => l.includes('postgres'))).toBe(true);
    });

    it('renders storage with null target, model, and table', () => {
      const storage: StorageNode = { id: 'core.s', kind: 'storage', name: 'generic', target: null, model: null as unknown as string, table: null as unknown as string };
      const mod = makeModule('core', { storages: [storage] } as unknown as Partial<ModuleNode>);
      const lines = renderStorageSection(makeCtx(mod));
      // All null fields → "—"
      const dashCount = lines.filter(l => l.includes('—')).length;
      expect(dashCount).toBeGreaterThanOrEqual(1);
    });

    it('returns empty for modules without storage', () => {
      expect(renderStorageSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderGovernanceSection', () => {
    it('renders security and privacy policies', () => {
      const security = makeSecurity('auth_policy', 'core');
      const privacy = makePrivacy('user_data', 'core');
      const mod = makeModule('core', { security: [security], privacy: [privacy] } as unknown as Partial<ModuleNode>);
      const lines = renderGovernanceSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Governance'))).toBe(true);
      expect(lines.some(l => l.includes('Security Policies'))).toBe(true);
      expect(lines.some(l => l.includes('Privacy Policies'))).toBe(true);
      expect(lines.some(l => l.includes('pii'))).toBe(true);
    });

    it('renders privacy with null classification, retention, exportable, erasable', () => {
      const privacy: PrivacyNode = {
        id: 'core.p', kind: 'privacy', name: 'minimal',
        applies_to: ['core.x'],
        classification: null as unknown as string,
        retention: null as unknown as string,
        exportable: null as unknown as string,
        erasable: null as unknown as string,
      };
      const mod = makeModule('core', { privacy: [privacy] } as unknown as Partial<ModuleNode>);
      const lines = renderGovernanceSection(makeCtx(mod));
      // All null fields → "—" in the table row
      expect(lines.some(l => (l.match(/—/g) ?? []).length >= 4)).toBe(true);
    });

    it('returns empty for modules without governance', () => {
      expect(renderGovernanceSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });

  describe('renderTestsSection', () => {
    it('renders test list', () => {
      const test = makeTest('task_creation', 'core');
      const mod = makeModule('core', { tests: [test] } as unknown as Partial<ModuleNode>);
      const lines = renderTestsSection(makeCtx(mod));

      expect(lines.some(l => l.includes('Tests'))).toBe(true);
      expect(lines.some(l => l.includes('1 spec test(s)'))).toBe(true);
      expect(lines.some(l => l.includes('task_creation'))).toBe(true);
    });

    it('returns empty for modules without tests', () => {
      expect(renderTestsSection(makeCtx(makeModule('core')))).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// module-renderer
// ---------------------------------------------------------------------------

describe('renderModuleDoc', () => {
  it('renders complete module doc with all sections', () => {
    const mod = makeModule('core', {
      imports: [{ symbol: 'User', from: 'auth', alias: null }],
      entities: [makeEntity('task', 'core', [{ name: 'id', type: 'uuid' }])],
      actors: [makeActor('admin', 'core')],
      workflows: [makeWorkflow('create', 'core', { steps: [{ call: 'save' }] })],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const resolve = createStringResolver(graph);
    const link = createLinkResolver(graph);

    const doc = renderModuleDoc(mod, graph, resolve, link);

    expect(doc).toContain('AUTO-GENERATED');
    expect(doc).toContain('# Core');
    expect(doc).toContain('Imports');
    expect(doc).toContain('`User`');
    expect(doc).toContain('from `auth`');
    expect(doc).toContain('Domain Model');
    expect(doc).toContain('Actors & Capabilities');
    expect(doc).toContain('Workflows');
  });

  it('renders module with import alias', () => {
    const mod = makeModule('core', {
      imports: [{ symbol: 'User', from: 'auth', alias: 'AuthUser' }],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const doc = renderModuleDoc(mod, graph, () => null, () => '');

    expect(doc).toContain('as `AuthUser`');
  });

  it('renders module without imports', () => {
    const mod = makeModule('core', {
      entities: [makeEntity('task', 'core', [{ name: 'id', type: 'uuid' }])],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const doc = renderModuleDoc(mod, graph, () => null, () => '');

    expect(doc).not.toContain('Imports');
  });
});

// ---------------------------------------------------------------------------
// product-renderer
// ---------------------------------------------------------------------------

describe('renderProductOverview', () => {
  it('renders product overview with module table', () => {
    const mod = makeModule('core', {
      entities: [makeEntity('task', 'core')],
      workflows: [makeWorkflow('wf', 'core')],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const doc = renderProductOverview(graph, () => null);

    expect(doc).toContain('# Test App');
    expect(doc).toContain('## Modules');
    expect(doc).toContain('[Core](core.md)');
    expect(doc).toContain('**Version:** 1.0');
  });

  it('renders actors and capabilities summary', () => {
    const mod = makeModule('core', {
      actors: [makeActor('admin', 'core')],
      capabilities: [makeCapability('manage', 'core', ['core.admin'])],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const doc = renderProductOverview(graph, () => null);

    expect(doc).toContain('## Actors');
    expect(doc).toContain('## Capabilities');
  });

  it('renders module dependency diagram when imports exist', () => {
    const mod = makeModule('core', {
      imports: [{ symbol: 'User', from: 'auth', alias: null }],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const doc = renderProductOverview(graph, () => null);

    expect(doc).toContain('Module Dependencies');
    expect(doc).toContain('mermaid');
    expect(doc).toContain('core --> auth');
  });

  it('omits dependency diagram when no imports', () => {
    const mod = makeModule('core');
    const graph = makeGraph([mod]);
    const doc = renderProductOverview(graph, () => null);

    expect(doc).not.toContain('Module Dependencies');
  });

  it('uses module summary descriptions', () => {
    const mod = makeModule('core', {
      entities: [makeEntity('task', 'core')],
      surfaces: [makeSurface('view', 'core')],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const doc = renderProductOverview(graph, () => null);

    expect(doc).toContain('1 entities');
    expect(doc).toContain('1 surfaces');
  });

  it('shows dash for modules with no notable content', () => {
    const mod = makeModule('empty');
    const graph = makeGraph([mod]);
    const doc = renderProductOverview(graph, () => null);

    expect(doc).toContain('—');
  });
});

// ---------------------------------------------------------------------------
// doc-renderer (generateDocs + writeDocs)
// ---------------------------------------------------------------------------



describe('generateDocs', () => {
  it('generates product README and per-module docs', () => {
    const mod = makeModule('core', {
      entities: [makeEntity('task', 'core', [{ name: 'id', type: 'uuid' }])],
    } as unknown as Partial<ModuleNode>);
    const graph = makeGraph([mod]);
    const config: ResolvedDocsConfig = { enabled: true, outputDir: 'docs/spec' };

    const files = generateDocs(graph, config, '/project');

    expect(files).toHaveLength(2);
    expect(files[0]!.path).toContain('README.md');
    expect(files[1]!.path).toContain('core.md');
    expect(files[0]!.content).toContain('Test App');
    expect(files[1]!.content).toContain('Core');
  });
});

describe('writeDocs', () => {
  it('writes files and cleans stale docs', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const tmpDir = require('node:os').tmpdir();
    const path = require('node:path') as typeof import('node:path');
    const outDir = path.join(fs.mkdtempSync(path.join(tmpDir, 'prodara-docgen-')), 'docs');
    fs.mkdirSync(outDir, { recursive: true });

    // Pre-create a stale file
    fs.writeFileSync(path.join(outDir, 'stale.md'), 'old');

    const files = [
      { path: path.join(outDir, 'README.md'), content: '# Hello' },
    ];

    writeDocs(files, outDir, '/');

    expect(fs.readFileSync(path.join(outDir, 'README.md'), 'utf-8')).toBe('# Hello');
    expect(fs.existsSync(path.join(outDir, 'stale.md'))).toBe(false);
  });

  it('does not delete files that were just written', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const tmpDir = require('node:os').tmpdir();
    const path = require('node:path') as typeof import('node:path');
    const outDir = path.join(fs.mkdtempSync(path.join(tmpDir, 'prodara-docgen-')), 'docs');
    fs.mkdirSync(outDir, { recursive: true });

    // Pre-create the file that will also be written
    fs.writeFileSync(path.join(outDir, 'README.md'), 'old');

    writeDocs(
      [{ path: path.join(outDir, 'README.md'), content: '# Test' }],
      outDir,
      '/',
    );

    expect(fs.readFileSync(path.join(outDir, 'README.md'), 'utf-8')).toBe('# Test');
  });
});
