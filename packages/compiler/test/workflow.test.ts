// ---------------------------------------------------------------------------
// Workflow phase engine tests
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  runWorkflow,
  runSpecifyPhase,
  runPlanPhase,
  runTasksPhase,
  runAnalyzePhase,
  runImplementPhase,
} from '../src/workflow/engine.js';
import { runClarifyPhase, autoResolveClarifications } from '../src/workflow/clarify.js';
import { PHASE_KINDS } from '../src/workflow/types.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';
import type { IncrementalSpec } from '../src/incremental/types.js';
import type { ResolvedConfig, ResolvedClarifyConfig } from '../src/config/config.js';
import type { ClarifyQuestion } from '../src/workflow/types.js';
import { DEFAULT_CONFIG } from '../src/config/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGraph(
  modules: ModuleNode[],
  edges: { from: string; to: string; kind: string }[] = [],
): ProductGraph {
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product', kind: 'product', name: 'test', title: null, version: null,
      modules: modules.map((m) => m.id), publishes: null,
    },
    modules,
    edges: edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind as 'contains' })),
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };
}

function pluralize(kind: string): string {
  if (kind === 'entity') return 'entities';
  return kind + 's';
}

function makeModule(name: string, items: { id: string; kind: string; name: string; [k: string]: unknown }[] = []): ModuleNode {
  const mod: Record<string, unknown> = { id: name, kind: 'module', name, imports: [] };
  for (const item of items) {
    const cat = pluralize(item.kind);
    if (!mod[cat]) mod[cat] = [];
    (mod[cat] as unknown[]).push(item);
  }
  return mod as unknown as ModuleNode;
}

function makeModuleWithImports(name: string, imports: { symbol: string; from: string }[], items: { id: string; kind: string; name: string }[] = []): ModuleNode {
  const mod: Record<string, unknown> = {
    id: name, kind: 'module', name,
    imports: imports.map((i) => ({ symbol: i.symbol, from: i.from, alias: null })),
  };
  for (const item of items) {
    const cat = pluralize(item.kind);
    if (!mod[cat]) mod[cat] = [];
    (mod[cat] as unknown[]).push(item);
  }
  return mod as unknown as ModuleNode;
}

function makeSpec(overrides: Partial<IncrementalSpec> = {}): IncrementalSpec {
  return {
    format: 'prodara-incremental-spec',
    version: '0.1.0',
    summary: {
      addedCount: 0, removedCount: 0, modifiedCount: 0,
      impactedCount: 0, taskCount: 0, affectedModules: [],
    },
    changes: [],
    impacts: [],
    tasks: [],
    slices: {} as IncrementalSpec['slices'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('PHASE_KINDS', () => {
  it('contains all 6 phases', () => {
    expect(PHASE_KINDS).toEqual(['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement']);
  });
});

// ---------------------------------------------------------------------------
// Specify phase
// ---------------------------------------------------------------------------

describe('runSpecifyPhase', () => {
  it('categorizes added/removed/modified/impacted', () => {
    const spec = makeSpec({
      summary: { addedCount: 1, removedCount: 1, modifiedCount: 1, impactedCount: 1, taskCount: 0, affectedModules: ['core'] },
      changes: [
        { nodeId: 'core.entity.a', changeKind: 'added', nodeKind: 'entity', module: 'core' },
        { nodeId: 'core.entity.b', changeKind: 'removed', nodeKind: 'entity', module: 'core' },
        { nodeId: 'core.entity.c', changeKind: 'structurally_changed', nodeKind: 'entity', module: 'core' },
      ],
      impacts: [
        { nodeId: 'core.workflow.d', reason: 'dep', via: 'writes', depth: 1, nodeKind: 'workflow', module: 'core' },
      ],
    });
    const graph = makeGraph([makeModule('core', [])]);
    const result = runSpecifyPhase(graph, spec);

    expect(result.phase).toBe('specify');
    expect(result.ok).toBe(true);
    expect(result.data.addedNodes).toHaveLength(1);
    expect(result.data.removedNodes).toHaveLength(1);
    expect(result.data.modifiedNodes).toHaveLength(1);
    expect(result.data.impactedNodes).toHaveLength(1);
    expect(result.data.affectedModules).toContain('core');
  });

  it('handles empty spec', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = runSpecifyPhase(graph, makeSpec());
    expect(result.ok).toBe(true);
    expect(result.data.addedNodes).toHaveLength(0);
  });

  it('describes all change kinds', () => {
    const spec = makeSpec({
      changes: [
        { nodeId: 'a', changeKind: 'renamed', nodeKind: 'entity', module: 'core' },
        { nodeId: 'b', changeKind: 'behaviorally_changed', nodeKind: 'entity', module: 'core' },
        { nodeId: 'c', changeKind: 'policy_changed', nodeKind: 'entity', module: 'core' },
      ],
    });
    const graph = makeGraph([makeModule('core', [])]);
    const result = runSpecifyPhase(graph, spec);
    expect(result.data.modifiedNodes).toHaveLength(3);
    expect(result.data.modifiedNodes.some((n) => n.description.includes('renamed'))).toBe(true);
    expect(result.data.modifiedNodes.some((n) => n.description.includes('behavior'))).toBe(true);
    expect(result.data.modifiedNodes.some((n) => n.description.includes('policy'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Clarify phase
// ---------------------------------------------------------------------------

describe('runClarifyPhase', () => {
  const clarifyConfig: ResolvedClarifyConfig = {
    agent: 'default', model: 'default',
    maxQuestions: 10, minimumQuestionPriority: 'medium',
    ambiguityThreshold: 'medium',
  };

  it('generates questions about empty modules', () => {
    const graph = makeGraph([makeModule('empty')]);
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    expect(result.phase).toBe('clarify');
    expect(result.ok).toBe(true);
    expect(result.data.questions.some((q) => q.category === 'empty_module')).toBe(true);
  });

  it('generates questions about unauthorized workflows', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.workflow.create', kind: 'workflow', name: 'create' }]),
    ]);
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    expect(result.data.questions.some((q) => q.category === 'missing_authorization')).toBe(true);
  });

  it('generates critical questions about unresolved imports', () => {
    const graph = makeGraph([
      makeModuleWithImports('core', [{ symbol: 'User', from: 'nonexistent' }]),
    ]);
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    expect(result.data.questions.some((q) => q.category === 'unresolved_import' && q.priority === 'critical')).toBe(true);
  });

  it('filters questions by priority', () => {
    const graph = makeGraph([makeModule('empty')]); // generates medium questions
    const highConfig: ResolvedClarifyConfig = {
      ...clarifyConfig, minimumQuestionPriority: 'critical',
    };
    const result = runClarifyPhase(graph, makeSpec(), highConfig);
    // empty_module questions are 'medium', so they should be filtered out
    expect(result.data.questions.every((q) => q.priority === 'critical')).toBe(true);
  });

  it('limits questions by maxQuestions', () => {
    const modules = Array.from({ length: 20 }, (_, i) => makeModule(`mod${i}`));
    const graph = makeGraph(modules);
    const limitConfig: ResolvedClarifyConfig = { ...clarifyConfig, maxQuestions: 3 };
    const result = runClarifyPhase(graph, makeSpec(), limitConfig);
    expect(result.data.questions.length).toBeLessThanOrEqual(3);
    expect(result.data.filteredCount).toBeLessThanOrEqual(3);
  });

  it('reports totalCount before filtering', () => {
    const modules = Array.from({ length: 5 }, (_, i) => makeModule(`mod${i}`));
    const graph = makeGraph(modules);
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    expect(result.data.totalCount).toBeGreaterThanOrEqual(result.data.filteredCount);
  });

  it('generates questions about actionless surfaces', () => {
    const graph = makeGraph([
      makeModule('ui', [{ id: 'ui.surface.page', kind: 'surface', name: 'page' }]),
    ]);
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    expect(result.data.questions.some((q) => q.category === 'missing_action')).toBe(true);
  });

  it('generates questions about entities without id fields', () => {
    const graph = makeGraph([
      makeModule('core', [{
        id: 'core.entity.item', kind: 'entity', name: 'item',
        fields: [{ name: 'title' }, { name: 'done' }],
      }]),
    ]);
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    expect(result.data.questions.some((q) => q.category === 'missing_field')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Plan phase
// ---------------------------------------------------------------------------

describe('runPlanPhase', () => {
  it('produces steps from tasks', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' }],
    });
    const result = runPlanPhase(graph, spec);

    expect(result.phase).toBe('plan');
    expect(result.ok).toBe(true);
    expect(result.data.steps).toHaveLength(1);
    expect(result.data.steps[0]!.stepId).toBe('step_t1');
    expect(result.data.steps[0]!.module).toBe('core');
    expect(result.data.steps[0]!.nodeKind).toBe('entity');
  });

  it('resolves step dependencies', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'item' },
        { id: 'core.workflow.create', kind: 'workflow', name: 'create' },
      ])],
      [{ from: 'core.workflow.create', to: 'core.entity.item', kind: 'writes' }],
    );
    const spec = makeSpec({
      tasks: [
        { taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' },
        { taskId: 't2', action: 'generate', nodeId: 'core.workflow.create', reason: 'new' },
      ],
    });
    const result = runPlanPhase(graph, spec);
    const wfStep = result.data.steps.find((s) => s.taskId === 't2');
    expect(wfStep?.dependsOn).toContain('step_t1');
  });

  it('handles tasks referencing unknown nodes', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'nonexistent.node', reason: 'new' }],
    });
    const result = runPlanPhase(graph, spec);
    expect(result.data.steps[0]!.module).toBe('');
    expect(result.data.steps[0]!.nodeKind).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// Tasks phase
// ---------------------------------------------------------------------------

describe('runTasksPhase', () => {
  it('produces ordered tasks', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'item' },
        { id: 'core.workflow.create', kind: 'workflow', name: 'create' },
      ]),
    ]);
    const spec = makeSpec({
      tasks: [
        { taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' },
        { taskId: 't2', action: 'generate', nodeId: 'core.workflow.create', reason: 'new' },
      ],
    });
    const result = runTasksPhase(graph, spec);

    expect(result.phase).toBe('tasks');
    expect(result.ok).toBe(true);
    expect(result.data.orderedTasks).toHaveLength(2);
  });

  it('handles empty tasks', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = runTasksPhase(graph, makeSpec());
    expect(result.data.orderedTasks).toHaveLength(0);
  });

  it('defaults module to empty for unknown nodes', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'unknown.node', reason: 'new' }],
    });
    const result = runTasksPhase(graph, spec);
    expect(result.data.orderedTasks[0]!.module).toBe('');
  });

  it('orders tasks respecting dependencies', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'item' },
        { id: 'core.workflow.create', kind: 'workflow', name: 'create' },
      ])],
      // workflow depends on entity via edge
      [{ from: 'core.workflow.create', to: 'core.entity.item', kind: 'references' }],
    );
    const spec = makeSpec({
      tasks: [
        { taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' },
        { taskId: 't2', action: 'generate', nodeId: 'core.workflow.create', reason: 'new' },
      ],
    });
    const result = runTasksPhase(graph, spec);
    expect(result.data.orderedTasks).toHaveLength(2);
    // t2 depends on t1, so t1 should come first
    const t1Order = result.data.orderedTasks.find((t) => t.taskId === 't1')!.order;
    const t2Order = result.data.orderedTasks.find((t) => t.taskId === 't2')!.order;
    expect(t1Order).toBeLessThan(t2Order);
  });

  it('handles cyclic dependencies gracefully', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.entity.a', kind: 'entity', name: 'a' },
        { id: 'core.entity.b', kind: 'entity', name: 'b' },
      ])],
      [
        { from: 'core.entity.a', to: 'core.entity.b', kind: 'references' },
        { from: 'core.entity.b', to: 'core.entity.a', kind: 'references' },
      ],
    );
    const spec = makeSpec({
      tasks: [
        { taskId: 't1', action: 'generate', nodeId: 'core.entity.a', reason: 'new' },
        { taskId: 't2', action: 'generate', nodeId: 'core.entity.b', reason: 'new' },
      ],
    });
    const result = runTasksPhase(graph, spec);
    // Both tasks should appear even with a cycle
    expect(result.data.orderedTasks).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Analyze phase
// ---------------------------------------------------------------------------

describe('runAnalyzePhase', () => {
  it('analyzes task risks', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [
        { from: 'core.entity.item', to: 'a', kind: 'field_type' },
        { from: 'core.entity.item', to: 'b', kind: 'field_type' },
        { from: 'core.entity.item', to: 'c', kind: 'field_type' },
        { from: 'core.entity.item', to: 'd', kind: 'field_type' },
        { from: 'core.entity.item', to: 'e', kind: 'field_type' },
        { from: 'core.entity.item', to: 'f', kind: 'field_type' },
      ],
    );
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'regenerate', nodeId: 'core.entity.item', reason: 'changed' }],
      changes: [{ nodeId: 'core.entity.item', changeKind: 'structurally_changed', nodeKind: 'entity', module: 'core' }],
    });
    const result = runAnalyzePhase(graph, spec);

    expect(result.phase).toBe('analyze');
    expect(result.ok).toBe(true);
    expect(result.data.analyses).toHaveLength(1);
    expect(result.data.analyses[0]!.riskFactors).toContain('high_outbound_edges');
    expect(result.data.analyses[0]!.riskFactors).toContain('entity_modification');
  });

  it('marks low risk for simple tasks', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'verify', nodeId: 'core', reason: 'check' }],
    });
    const result = runAnalyzePhase(graph, spec);
    expect(result.data.analyses[0]!.riskLevel).toBe('low');
  });

  it('marks removal as medium risk', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'remove', nodeId: 'core.entity.old', reason: 'removed' }],
    });
    const result = runAnalyzePhase(graph, spec);
    expect(result.data.analyses[0]!.riskFactors).toContain('removal');
  });

  it('detects high inbound edges', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      Array.from({ length: 6 }, (_, i) => ({
        from: `other.${i}`, to: 'core.entity.item', kind: 'references',
      })),
    );
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'regenerate', nodeId: 'core.entity.item', reason: 'changed' }],
    });
    const result = runAnalyzePhase(graph, spec);
    expect(result.data.analyses[0]!.riskFactors).toContain('high_inbound_edges');
  });

  it('marks high risk when 3+ factors', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [
        ...Array.from({ length: 6 }, (_, i) => ({
          from: `other.${i}`, to: 'core.entity.item', kind: 'references',
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          from: 'core.entity.item', to: `dep.${i}`, kind: 'field_type',
        })),
      ],
    );
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'regenerate', nodeId: 'core.entity.item', reason: 'changed' }],
      changes: [{ nodeId: 'core.entity.item', changeKind: 'structurally_changed', nodeKind: 'entity', module: 'core' }],
    });
    const result = runAnalyzePhase(graph, spec);
    expect(result.data.analyses[0]!.riskLevel).toBe('high');
    expect(result.data.analyses[0]!.riskFactors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Implement phase
// ---------------------------------------------------------------------------

describe('runImplementPhase', () => {
  it('produces instructions for tasks', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [{ from: 'core.entity.item', to: 'core.rule.valid', kind: 'uses_rule' }],
    );
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' }],
    });
    const result = runImplementPhase(graph, spec);

    expect(result.phase).toBe('implement');
    expect(result.ok).toBe(true);
    expect(result.data.instructions).toHaveLength(1);
    expect(result.data.instructions[0]!.module).toBe('core');
    expect(result.data.instructions[0]!.nodeKind).toBe('entity');
    expect(result.data.instructions[0]!.relatedEdges.length).toBeGreaterThan(0);
  });

  it('handles tasks referencing unknown nodes', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'nonexistent.node', reason: 'new' }],
    });
    const result = runImplementPhase(graph, spec);
    expect(result.data.instructions[0]!.module).toBe('');
    expect(result.data.instructions[0]!.nodeKind).toBe('unknown');
  });

  it('includes incoming edges in related edges', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [{ from: 'core.workflow.create', to: 'core.entity.item', kind: 'writes' }],
    );
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' }],
    });
    const result = runImplementPhase(graph, spec);
    expect(result.data.instructions[0]!.relatedEdges.length).toBeGreaterThan(0);
    expect(result.data.instructions[0]!.relatedEdges[0]).toContain('writes');
  });
});

// ---------------------------------------------------------------------------
// Full workflow
// ---------------------------------------------------------------------------

describe('runWorkflow', () => {
  it('runs all 6 phases', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const spec = makeSpec({
      tasks: [{ taskId: 't1', action: 'generate', nodeId: 'core.entity.item', reason: 'new' }],
    });
    const result = runWorkflow(graph, spec, DEFAULT_CONFIG);

    expect(result.ok).toBe(true);
    expect(result.phases).toHaveLength(6);
    expect(result.phases.map((p) => p.phase)).toEqual(
      ['specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement'],
    );
  });

  it('reports ok=true when all phases succeed', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const result = runWorkflow(graph, makeSpec(), DEFAULT_CONFIG);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auto-clarify
// ---------------------------------------------------------------------------

describe('autoResolveClarifications', () => {
  function makeQ(overrides: Partial<ClarifyQuestion> & { id: string; category: ClarifyQuestion['category'] }): ClarifyQuestion {
    return {
      priority: 'medium',
      nodeId: null,
      question: 'test?',
      confidence: 'medium',
      ...overrides,
    };
  }

  const emptyGraph = makeGraph([]);

  it('auto-resolves empty_module questions at low threshold', () => {
    const graph = makeGraph([makeModule('billing')]);
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'empty_module', nodeId: 'billing', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'low', graph);
    expect(result.autoResolved).toHaveLength(1);
    expect(result.needsInput).toHaveLength(0);
    expect(result.autoResolved[0]!.answer).toContain('billing');
    expect(result.autoResolved[0]!.reason).toBeTruthy();
  });

  it('moves low-confidence questions to needsInput when threshold is high', () => {
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'empty_module', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'high', emptyGraph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(1);
  });

  it('auto-resolves missing_field with id convention', () => {
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'missing_field', confidence: 'high' }),
    ];
    const result = autoResolveClarifications(questions, 'medium', emptyGraph);
    expect(result.autoResolved).toHaveLength(1);
    expect(result.autoResolved[0]!.answer).toContain('id');
  });

  it('auto-resolves missing_authorization with auth default', () => {
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'missing_authorization', confidence: 'medium' }),
    ];
    const result = autoResolveClarifications(questions, 'low', emptyGraph);
    expect(result.autoResolved).toHaveLength(1);
    expect(result.autoResolved[0]!.answer).toContain('authenticated');
  });

  it('auto-resolves missing_action when surface found in graph', () => {
    const graph = makeGraph([
      makeModule('ui', [{ id: 'ui.surface.dash', kind: 'surface', name: 'dashboard' }]),
    ]);
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'missing_action', nodeId: 'ui.surface.dash', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'low', graph);
    expect(result.autoResolved).toHaveLength(1);
    expect(result.autoResolved[0]!.answer).toContain('dashboard');
  });

  it('never auto-resolves unresolved_import', () => {
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'unresolved_import', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'low', emptyGraph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(1);
  });

  it('splits mixed questions correctly', () => {
    const graph = makeGraph([makeModule('core')]);
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'missing_field', confidence: 'high' }),
      makeQ({ id: 'q2', category: 'unresolved_import', confidence: 'low' }),
      makeQ({ id: 'q3', category: 'missing_authorization', confidence: 'medium' }),
    ];
    const result = autoResolveClarifications(questions, 'medium', graph);
    expect(result.autoResolved).toHaveLength(2); // missing_field (high>=medium) + missing_authorization (medium>=medium)
    expect(result.needsInput).toHaveLength(1); // unresolved_import (low<medium, or no answer)
  });

  it('returns all as needsInput when threshold is high and confidence is low', () => {
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'empty_module', confidence: 'low' }),
      makeQ({ id: 'q2', category: 'missing_action', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'high', emptyGraph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(2);
  });

  it('handles empty question list', () => {
    const result = autoResolveClarifications([], 'medium', emptyGraph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(0);
  });

  it('clarify questions now include confidence field', () => {
    const graph = makeGraph([makeModule('empty')]);
    const clarifyConfig: ResolvedClarifyConfig = {
      agent: 'default', model: 'default',
      maxQuestions: 10, minimumQuestionPriority: 'medium',
      ambiguityThreshold: 'medium',
    };
    const result = runClarifyPhase(graph, makeSpec(), clarifyConfig);
    for (const q of result.data.questions) {
      expect(q.confidence).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(q.confidence);
    }
  });

  it('falls through to needsInput when empty_module references unknown module', () => {
    // nodeId doesn't match any module in graph → deriveAnswer returns null → needsInput
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'empty_module', nodeId: 'nonexistent', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'low', emptyGraph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(1);
  });

  it('falls through to needsInput when missing_action surface not in graph', () => {
    // nodeId references a surface not present in graph → null → needsInput
    // Graph has a module WITHOUT surfaces property → exercises ?? fallback branch
    const graph = makeGraph([makeModule('core')]);
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'missing_action', nodeId: 'unknown.surface', confidence: 'low' }),
    ];
    const result = autoResolveClarifications(questions, 'low', graph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(1);
  });

  it('falls through to needsInput for unknown category', () => {
    const questions: ClarifyQuestion[] = [
      makeQ({ id: 'q1', category: 'ambiguous_type' as ClarifyQuestion['category'], confidence: 'medium' }),
    ];
    const result = autoResolveClarifications(questions, 'low', emptyGraph);
    expect(result.autoResolved).toHaveLength(0);
    expect(result.needsInput).toHaveLength(1);
  });
});
