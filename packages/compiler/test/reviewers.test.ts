// ---------------------------------------------------------------------------
// Reviewer module tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';
import { runReviewers, runReviewFixLoop, runReviewFixLoopAsync, buildFixPrompt, runFixAttempt } from '../src/reviewers/reviewer.js';
import { architectureReviewer } from '../src/reviewers/architecture.js';
import { qualityReviewer } from '../src/reviewers/quality.js';
import { codeQualityReviewer } from '../src/reviewers/code-quality.js';
import { specificationReviewer } from '../src/reviewers/specification.js';
import { uxReviewer } from '../src/reviewers/ux.js';
import { securityReviewer } from '../src/reviewers/security.js';
import { testQualityReviewer } from '../src/reviewers/test-quality.js';
import { adversarialReviewer } from '../src/reviewers/adversarial.js';
import { edgeCaseReviewer } from '../src/reviewers/edge-case.js';
import { DEFAULT_REVIEWERS } from '../src/reviewers/index.js';
import type { ReviewerAgent } from '../src/reviewers/reviewer.js';
import type { ProductGraph, ModuleNode } from '../src/graph/graph-types.js';
import type { IncrementalSpec } from '../src/incremental/types.js';
import type { ResolvedReviewerConfig } from '../src/config/config.js';
import type { AgentDriver, AgentResponse } from '../src/agent/types.js';
import type { ReviewFinding } from '../src/reviewers/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGraph(
  modules: ModuleNode[],
  edges: { from: string; to: string; kind: string }[] = [],
  productModules?: string[],
): ProductGraph {
  const modIds = productModules ?? modules.map((m) => m.id);
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: {
      id: 'product', kind: 'product', name: 'test', title: null, version: null,
      modules: modIds, publishes: null,
    },
    modules,
    edges: edges.map((e) => ({ from: e.from, to: e.to, kind: e.kind as 'contains' })),
    metadata: { compiler: 'test', compiled_at: '', source_files: [] },
  };
}

function pluralize(kind: string): string {
  if (kind === 'entity') return 'entities';
  if (kind === 'policy') return 'policies';
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

function makeModuleWithImports(name: string, imports: { symbol: string; from: string }[]): ModuleNode {
  return {
    id: name, kind: 'module', name,
    imports: imports.map((i) => ({ symbol: i.symbol, from: i.from, alias: null })),
  } as unknown as ModuleNode;
}

function makeSpec(): IncrementalSpec {
  return {
    format: 'prodara-incremental-spec',
    version: '0.1.0',
    summary: { addedCount: 0, removedCount: 0, modifiedCount: 0, impactedCount: 0, taskCount: 0, affectedModules: [] },
    changes: [],
    impacts: [],
    tasks: [],
    slices: {} as IncrementalSpec['slices'],
  };
}

const ENABLED: ResolvedReviewerConfig = { enabled: true, promptPath: null };
const DISABLED: ResolvedReviewerConfig = { enabled: false, promptPath: null };

function defaultConfigs(): Record<string, ResolvedReviewerConfig> {
  return {
    architecture: ENABLED,
    quality: ENABLED,
    codeQuality: ENABLED,
    specification: ENABLED,
    ux: ENABLED,
    security: ENABLED,
    testQuality: ENABLED,
    adversarial: DISABLED,
    edgeCase: DISABLED,
  };
}

// ---------------------------------------------------------------------------
// Architecture reviewer
// ---------------------------------------------------------------------------

describe('architectureReviewer', () => {
  it('has correct name', () => {
    expect(architectureReviewer.name).toBe('architecture');
  });

  it('warns about empty modules', () => {
    const graph = makeGraph([makeModule('empty')]);
    const findings = architectureReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'empty_module')).toBe(true);
  });

  it('does not warn when module has entities', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const findings = architectureReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'empty_module')).toBe(false);
  });

  it('warns about workflows without authorization', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.workflow.create', kind: 'workflow', name: 'create' }]),
    ]);
    const findings = architectureReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_authorization')).toBe(true);
  });

  it('does not warn when workflow has authorization', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.workflow.create', kind: 'workflow', name: 'create' }])],
      [{ from: 'core.workflow.create', to: 'core.actor.admin', kind: 'authorized_as' }],
    );
    const findings = architectureReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_authorization')).toBe(false);
  });

  it('detects high coupling', () => {
    const modules = [
      makeModule('a', [{ id: 'a.entity.x', kind: 'entity', name: 'x' }]),
      makeModule('b', [{ id: 'b.entity.y', kind: 'entity', name: 'y' }]),
    ];
    // Create many cross-module edges (> moduleCount * 10 = 20)
    const edges = Array.from({ length: 25 }, (_, i) => ({
      from: `a.entity.x`, to: `b.entity.y`, kind: `field_type`,
    }));
    const graph = makeGraph(modules, edges);
    const findings = architectureReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'high_coupling')).toBe(true);
  });

  it('ignores edges with single-segment node IDs for coupling', () => {
    const modules = [
      makeModule('a', [{ id: 'a.entity.x', kind: 'entity', name: 'x' }]),
      makeModule('b', [{ id: 'b.entity.y', kind: 'entity', name: 'y' }]),
    ];
    // Edges where one side has no dot → extractModule returns null → not cross-module
    const edges = Array.from({ length: 25 }, () => ({
      from: 'nodot', to: 'b.entity.y', kind: 'field_type',
    }));
    const graph = makeGraph(modules, edges);
    const findings = architectureReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'high_coupling')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Quality reviewer
// ---------------------------------------------------------------------------

describe('qualityReviewer', () => {
  it('has correct name', () => {
    expect(qualityReviewer.name).toBe('quality');
  });

  it('notes entities without rules', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const findings = qualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_rules')).toBe(true);
  });

  it('does not flag entities with rules', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [{ from: 'core.entity.item', to: 'core.rule.valid', kind: 'uses_rule' }],
    );
    const findings = qualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_rules')).toBe(false);
  });

  it('warns about modules without tests', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const findings = qualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tests')).toBe(true);
  });

  it('does not warn when module has tests', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'item' },
        { id: 'core.test.check', kind: 'test', name: 'check' },
      ]),
    ]);
    const findings = qualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tests')).toBe(false);
  });

  it('flags non-snake_case names', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.MyEntity', kind: 'entity', name: 'MyEntity' }]),
    ]);
    const findings = qualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'naming_convention')).toBe(true);
  });

  it('does not flag snake_case names', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.my_entity', kind: 'entity', name: 'my_entity' }]),
    ]);
    const findings = qualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'naming_convention')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Code quality reviewer
// ---------------------------------------------------------------------------

describe('codeQualityReviewer', () => {
  it('has correct name', () => {
    expect(codeQualityReviewer.name).toBe('codeQuality');
  });

  it('finds invalid edge sources', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [{ from: 'nonexistent', to: 'core', kind: 'contains' }],
    );
    const findings = codeQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'invalid_edge_source')).toBe(true);
  });

  it('finds invalid edge targets', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [{ from: 'core', to: 'nonexistent', kind: 'contains' }],
    );
    const findings = codeQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'invalid_edge_target')).toBe(true);
  });

  it('finds orphan nodes', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.orphan', kind: 'entity', name: 'orphan' }]),
    ]);
    // No edges referencing core.entity.orphan
    const findings = codeQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'orphan_node')).toBe(true);
  });

  it('does not flag connected nodes', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [{ from: 'core', to: 'core.entity.item', kind: 'contains' }],
    );
    const findings = codeQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'orphan_node')).toBe(false);
  });

  it('detects duplicate edges', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [
        { from: 'core', to: 'core.entity.item', kind: 'contains' },
        { from: 'core', to: 'core.entity.item', kind: 'contains' },
      ],
    );
    const findings = codeQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'duplicate_edge')).toBe(true);
  });

  it('passes clean graph', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }])],
      [{ from: 'core', to: 'core.entity.item', kind: 'contains' }],
    );
    const findings = codeQualityReviewer.review(graph, makeSpec());
    expect(findings.every((f) => f.severity !== 'error' && f.severity !== 'critical')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Specification reviewer
// ---------------------------------------------------------------------------

describe('specificationReviewer', () => {
  it('has correct name', () => {
    expect(specificationReviewer.name).toBe('specification');
  });

  it('detects unlisted modules', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [],
      [], // product lists no modules
    );
    const findings = specificationReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'unlisted_module')).toBe(true);
  });

  it('detects missing modules referenced by product', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [],
      ['core', 'missing'], // product references 'missing'
    );
    const findings = specificationReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_module')).toBe(true);
  });

  it('detects unresolved imports', () => {
    const graph = makeGraph([makeModuleWithImports('core', [{ symbol: 'User', from: 'nonexistent' }])]);
    const findings = specificationReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'unresolved_import')).toBe(true);
  });

  it('detects actionless surfaces', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.surface.dashboard', kind: 'surface', name: 'dashboard' }]),
    ]);
    const findings = specificationReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'actionless_surface')).toBe(true);
  });

  it('does not flag surfaces with actions', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.surface.dashboard', kind: 'surface', name: 'dashboard' }])],
      [{ from: 'core.surface.dashboard', to: 'core.action.view', kind: 'exposes_action' }],
    );
    const findings = specificationReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'actionless_surface')).toBe(false);
  });

  it('passes a well-formed graph', () => {
    const graph = makeGraph(
      [makeModule('core', [])],
      [],
      ['core'],
    );
    const findings = specificationReviewer.review(graph, makeSpec());
    expect(findings.every((f) => f.severity !== 'error')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UX reviewer
// ---------------------------------------------------------------------------

describe('uxReviewer', () => {
  it('has correct name', () => {
    expect(uxReviewer.name).toBe('ux');
  });

  it('notes surfaces without renderings', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.surface.dash', kind: 'surface', name: 'dash' }]),
    ]);
    const findings = uxReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_rendering')).toBe(true);
  });

  it('notes modules with surfaces but no tokens', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.surface.dash', kind: 'surface', name: 'dash' }]),
    ]);
    const findings = uxReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tokens')).toBe(true);
  });

  it('detects unbound renderings', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.rendering.main', kind: 'rendering', name: 'main' }]),
    ]);
    const findings = uxReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'unbound_rendering')).toBe(true);
  });

  it('does not flag bound renderings', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.rendering.main', kind: 'rendering', name: 'main' }])],
      [{ from: 'core.rendering.main', to: 'core.surface.dash', kind: 'targets_surface' }],
    );
    const findings = uxReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'unbound_rendering')).toBe(false);
  });

  it('notes form surfaces without rules', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.surface.form', kind: 'surface', name: 'form' },
        { id: 'core.action.submit', kind: 'action', name: 'submit' },
      ])],
      [
        { from: 'core.surface.form', to: 'core.action.submit', kind: 'exposes_action' },
        { from: 'core.action.submit', to: 'core.entity.item', kind: 'writes' },
      ],
    );
    const findings = uxReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'form_missing_rules')).toBe(true);
  });

  it('does not flag non-write surfaces', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.surface.list', kind: 'surface', name: 'list' },
        { id: 'core.action.view', kind: 'action', name: 'view' },
      ])],
      [
        { from: 'core.surface.list', to: 'core.action.view', kind: 'exposes_action' },
        { from: 'core.action.view', to: 'core.entity.item', kind: 'reads' },
      ],
    );
    const findings = uxReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'form_missing_rules')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// securityReviewer
// ---------------------------------------------------------------------------

describe('securityReviewer', () => {
  it('has correct name', () => {
    expect(securityReviewer.name).toBe('security');
  });

  it('reports workflows modifying entities without authorization', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.workflow.create', kind: 'workflow', name: 'CreateItem' },
        { id: 'core.entity.item', kind: 'entity', name: 'Item' },
      ])],
      [
        { from: 'core.workflow.create', to: 'core.entity.item', kind: 'writes' },
      ],
    );
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_authorization' && f.severity === 'error')).toBe(true);
  });

  it('no finding when workflow has authorization', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.workflow.create', kind: 'workflow', name: 'CreateItem' },
        { id: 'core.entity.item', kind: 'entity', name: 'Item' },
      ])],
      [
        { from: 'core.workflow.create', to: 'core.entity.item', kind: 'writes' },
        { from: 'core.workflow.create', to: 'core.role.admin', kind: 'authorized_as' },
      ],
    );
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_authorization')).toBe(false);
  });

  it('reports entities with sensitive fields without access control', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.user', kind: 'entity', name: 'User' },
    ]);
    (mod as Record<string, unknown>)['entities'] = [
      { id: 'core.entity.user', kind: 'entity', name: 'User', fields: [{ name: 'password', type: 'string' }] },
    ];
    const graph = makeGraph([mod]);
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'sensitive_data' && f.severity === 'warning')).toBe(true);
  });

  it('no finding for sensitive fields with access control', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.user', kind: 'entity', name: 'User' },
    ]);
    (mod as Record<string, unknown>)['entities'] = [
      { id: 'core.entity.user', kind: 'entity', name: 'User', fields: [{ name: 'api_key', type: 'string' }] },
    ];
    const graph = makeGraph([mod], [
      { from: 'core.role.admin', to: 'core.entity.user', kind: 'authorized_as' },
    ]);
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'sensitive_data')).toBe(false);
  });

  it('no finding for entity without sensitive fields', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.item', kind: 'entity', name: 'Item' },
    ]);
    (mod as Record<string, unknown>)['entities'] = [
      { id: 'core.entity.item', kind: 'entity', name: 'Item', fields: [{ name: 'title', type: 'string' }] },
    ];
    const graph = makeGraph([mod]);
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'sensitive_data')).toBe(false);
  });

  it('reports published events without authorization', () => {
    const mods = [makeModule('core', [])];
    const graph = makeGraph(mods);
    (graph.product as unknown as Record<string, unknown>)['publishes'] = { webhook: ['evt_order_placed'] };
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'exposed_without_auth' && f.nodeId === 'evt_order_placed')).toBe(true);
  });

  it('no finding when product has no publishes', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'exposed_without_auth')).toBe(false);
  });

  it('handles entity without fields array', () => {
    const mod = makeModule('core', [
      { id: 'core.entity.item', kind: 'entity', name: 'Item' },
    ]);
    const graph = makeGraph([mod]);
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'sensitive_data')).toBe(false);
  });

  it('handles entity not found in getFieldNames', () => {
    // Entity in getNodeArray but not matching ID for fields
    const mod = makeModule('core', []);
    (mod as Record<string, unknown>)['entities'] = [
      { id: 'core.entity.x', kind: 'entity', name: 'X' },
    ];
    // Create a workflow that modifies a different entity
    (mod as Record<string, unknown>)['workflows'] = [];
    const graph = makeGraph([mod]);
    // No sensitive fields findings expected since entity has no fields
    const findings = securityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'sensitive_data')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// testQualityReviewer
// ---------------------------------------------------------------------------

describe('testQualityReviewer', () => {
  it('has correct name', () => {
    expect(testQualityReviewer.name).toBe('testQuality');
  });

  it('warns about modules with entities but no tests', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'Item' },
      ]),
    ]);
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tests')).toBe(true);
  });

  it('no warning when module has entities and tests', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'Item' },
        { id: 'core.test.item_test', kind: 'test', name: 'ItemTest' },
      ]),
    ]);
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tests')).toBe(false);
  });

  it('reports low test-to-entity ratio', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.a', kind: 'entity', name: 'A' },
        { id: 'core.entity.b', kind: 'entity', name: 'B' },
        { id: 'core.entity.c', kind: 'entity', name: 'C' },
        { id: 'core.test.one', kind: 'test', name: 'OneTest' },
      ]),
    ]);
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'low_test_ratio')).toBe(true);
  });

  it('no low ratio when tests >= entities', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.a', kind: 'entity', name: 'A' },
        { id: 'core.test.a', kind: 'test', name: 'TestA' },
      ]),
    ]);
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'low_test_ratio')).toBe(false);
  });

  it('reports untested workflows', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.workflow.submit', kind: 'workflow', name: 'Submit' },
        { id: 'core.test.basic', kind: 'test', name: 'BasicTest' },
      ])],
    );
    // No tests edge pointing to the workflow
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'untested_workflow' && f.nodeId === 'core.workflow.submit')).toBe(true);
  });

  it('no untested workflow when test edge exists', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.workflow.submit', kind: 'workflow', name: 'Submit' },
        { id: 'core.test.submit', kind: 'test', name: 'SubmitTest' },
      ])],
      [{ from: 'core.test.submit', to: 'core.workflow.submit', kind: 'tests' }],
    );
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'untested_workflow')).toBe(false);
  });

  it('skips untested workflow check when no tests at all', () => {
    const graph = makeGraph(
      [makeModule('core', [
        { id: 'core.workflow.submit', kind: 'workflow', name: 'Submit' },
      ])],
    );
    const findings = testQualityReviewer.review(graph, makeSpec());
    // No tests at all → missing_tests warning will fire for entities but untested_workflow checks skipped
    expect(findings.some((f) => f.category === 'untested_workflow')).toBe(false);
  });

  it('reports error when many entities but zero tests globally', () => {
    const graph = makeGraph([
      makeModule('a', [
        { id: 'a.entity.1', kind: 'entity', name: 'E1' },
        { id: 'a.entity.2', kind: 'entity', name: 'E2' },
      ]),
      makeModule('b', [
        { id: 'b.entity.3', kind: 'entity', name: 'E3' },
        { id: 'b.entity.4', kind: 'entity', name: 'E4' },
      ]),
    ]);
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'no_tests' && f.severity === 'error')).toBe(true);
  });

  it('no global error when some tests exist', () => {
    const graph = makeGraph([
      makeModule('a', [
        { id: 'a.entity.1', kind: 'entity', name: 'E1' },
        { id: 'a.entity.2', kind: 'entity', name: 'E2' },
        { id: 'a.test.1', kind: 'test', name: 'T1' },
      ]),
      makeModule('b', [
        { id: 'b.entity.3', kind: 'entity', name: 'E3' },
        { id: 'b.entity.4', kind: 'entity', name: 'E4' },
      ]),
    ]);
    const findings = testQualityReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'no_tests')).toBe(false);
  });

  it('warns when changed nodes exist but no tests', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec();
    (spec as { tasks: unknown }).tasks = [
      { taskId: 't1', nodeId: 'core.entity.item', action: 'generate', reason: 'new' },
    ];
    const findings = testQualityReviewer.review(graph, spec);
    expect(findings.some((f) => f.category === 'changes_without_tests')).toBe(true);
  });

  it('no warning for changed nodes when tests exist', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.test.basic', kind: 'test', name: 'BasicTest' },
      ]),
    ]);
    const spec = makeSpec();
    (spec as { tasks: unknown }).tasks = [
      { taskId: 't1', nodeId: 'core.entity.item', action: 'generate', reason: 'new' },
    ];
    const findings = testQualityReviewer.review(graph, spec);
    expect(findings.some((f) => f.category === 'changes_without_tests')).toBe(false);
  });

  it('ignores non-generate/regenerate tasks for changes_without_tests', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const spec = makeSpec();
    (spec as { tasks: unknown }).tasks = [
      { taskId: 't1', nodeId: 'core.entity.old', action: 'remove', reason: 'deprecated' },
    ];
    const findings = testQualityReviewer.review(graph, spec);
    expect(findings.some((f) => f.category === 'changes_without_tests')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_REVIEWERS
// ---------------------------------------------------------------------------

describe('DEFAULT_REVIEWERS', () => {
  it('contains all 9 built-in reviewers', () => {
    expect(DEFAULT_REVIEWERS).toHaveLength(9);
    const names = DEFAULT_REVIEWERS.map((r) => r.name);
    expect(names).toContain('architecture');
    expect(names).toContain('quality');
    expect(names).toContain('codeQuality');
    expect(names).toContain('specification');
    expect(names).toContain('ux');
    expect(names).toContain('security');
    expect(names).toContain('testQuality');
    expect(names).toContain('adversarial');
    expect(names).toContain('edgeCase');
  });
});

// ---------------------------------------------------------------------------
// runReviewers
// ---------------------------------------------------------------------------

describe('runReviewers', () => {
  it('runs all enabled reviewers', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const results = runReviewers(DEFAULT_REVIEWERS, defaultConfigs(), graph, makeSpec());
    expect(results).toHaveLength(7);
    expect(results.map((r) => r.reviewer)).toEqual(
      ['architecture', 'quality', 'codeQuality', 'specification', 'ux', 'security', 'testQuality'],
    );
  });

  it('skips disabled reviewers', () => {
    const graph = makeGraph([makeModule('core', [])]);
    const configs = { ...defaultConfigs(), architecture: DISABLED };
    const results = runReviewers(DEFAULT_REVIEWERS, configs, graph, makeSpec());
    expect(results).toHaveLength(6);
    expect(results.map((r) => r.reviewer)).not.toContain('architecture');
  });

  it('sets passed=false when findings have errors', () => {
    const badReviewer: ReviewerAgent = {
      name: 'bad',
      description: 'test',
      review: () => [{ reviewer: 'bad', severity: 'error', category: 'test', message: 'fail' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const results = runReviewers([badReviewer], { bad: ENABLED }, graph, makeSpec());
    expect(results[0]!.passed).toBe(false);
  });

  it('sets passed=true when only warnings/info', () => {
    const okReviewer: ReviewerAgent = {
      name: 'ok',
      description: 'test',
      review: () => [{ reviewer: 'ok', severity: 'warning', category: 'test', message: 'warn' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const results = runReviewers([okReviewer], { ok: ENABLED }, graph, makeSpec());
    expect(results[0]!.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runReviewFixLoop
// ---------------------------------------------------------------------------

describe('runReviewFixLoop', () => {
  it('completes in one cycle when no errors', () => {
    const cleanReviewer: ReviewerAgent = {
      name: 'clean',
      description: 'test',
      review: () => [],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const cycles = runReviewFixLoop([cleanReviewer], { clean: ENABLED }, graph, makeSpec(), 3);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.accepted).toBe(true);
  });

  it('runs max iterations when errors persist', () => {
    const failReviewer: ReviewerAgent = {
      name: 'fail',
      description: 'test',
      review: () => [{ reviewer: 'fail', severity: 'error', category: 'test', message: 'always fails' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const cycles = runReviewFixLoop([failReviewer], { fail: ENABLED }, graph, makeSpec(), 3);
    expect(cycles).toHaveLength(3);
    expect(cycles[2]!.accepted).toBe(false);
  });

  it('tracks findings counts', () => {
    const mixedReviewer: ReviewerAgent = {
      name: 'mix',
      description: 'test',
      review: () => [
        { reviewer: 'mix', severity: 'critical', category: 'a', message: 'crit' },
        { reviewer: 'mix', severity: 'error', category: 'b', message: 'err' },
        { reviewer: 'mix', severity: 'warning', category: 'c', message: 'warn' },
      ],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const cycles = runReviewFixLoop([mixedReviewer], { mix: ENABLED }, graph, makeSpec(), 1);
    expect(cycles[0]!.criticalCount).toBe(1);
    expect(cycles[0]!.errorCount).toBe(1);
    expect(cycles[0]!.warningCount).toBe(1);
    expect(cycles[0]!.totalFindings).toBe(3);
  });

  it('handles single iteration max', () => {
    const failReviewer: ReviewerAgent = {
      name: 'fail',
      description: 'test',
      review: () => [{ reviewer: 'fail', severity: 'error', category: 'x', message: 'bad' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const cycles = runReviewFixLoop([failReviewer], { fail: ENABLED }, graph, makeSpec(), 1);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.accepted).toBe(false);
  });

  it('includes fixAttempt as null in sync mode', () => {
    const cleanReviewer: ReviewerAgent = {
      name: 'clean',
      description: 'test',
      review: () => [],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const cycles = runReviewFixLoop([cleanReviewer], { clean: ENABLED }, graph, makeSpec(), 1);
    expect(cycles[0]!.fixAttempt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildFixPrompt
// ---------------------------------------------------------------------------

describe('buildFixPrompt', () => {
  it('builds prompt from actionable findings', () => {
    const findings: ReviewFinding[] = [
      { reviewer: 'arch', severity: 'error', category: 'coupling', message: 'too coupled', suggestion: 'extract service' },
      { reviewer: 'quality', severity: 'warning', category: 'naming', message: 'bad name' },
      { reviewer: 'arch', severity: 'critical', category: 'security', nodeId: 'ent_user', message: 'no auth' },
    ];

    const prompt = buildFixPrompt(findings, ['critical', 'error']);
    expect(prompt).toContain('# Fix Request');
    expect(prompt).toContain('2 finding(s)');
    expect(prompt).toContain('[ERROR] arch: coupling');
    expect(prompt).toContain('too coupled');
    expect(prompt).toContain('Suggestion: extract service');
    expect(prompt).toContain('[CRITICAL] arch: security');
    expect(prompt).toContain('Node: ent_user');
    expect(prompt).not.toContain('bad name');
  });

  it('returns empty string when no actionable findings', () => {
    const findings: ReviewFinding[] = [
      { reviewer: 'r', severity: 'info', category: 'note', message: 'just info' },
    ];
    expect(buildFixPrompt(findings, ['error'])).toBe('');
  });

  it('handles empty findings array', () => {
    expect(buildFixPrompt([], ['error'])).toBe('');
  });

  it('includes suggestion only when present', () => {
    const findings: ReviewFinding[] = [
      { reviewer: 'r', severity: 'error', category: 'x', message: 'msg' },
    ];
    const prompt = buildFixPrompt(findings, ['error']);
    expect(prompt).toContain('msg');
    expect(prompt).not.toContain('Suggestion:');
  });
});

// ---------------------------------------------------------------------------
// runFixAttempt
// ---------------------------------------------------------------------------

describe('runFixAttempt', () => {
  function makeDriver(status: AgentResponse['status'] = 'success'): AgentDriver {
    return {
      platform: 'api',
      execute: vi.fn(async () => ({
        content: 'fixed code',
        status,
        metadata: { platform: 'api' as const, duration_ms: 50, tokens_used: 20, model: 'gpt-4o' },
      })),
    };
  }

  it('sends fix request and returns success result', async () => {
    const findings: ReviewFinding[] = [
      { reviewer: 'r', severity: 'error', category: 'x', message: 'bad' },
    ];
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver();
    const result = await runFixAttempt(driver, findings, ['error'], graph, 1);
    expect(result.status).toBe('success');
    expect(result.findingsAddressed).toBe(1);
    expect(result.iteration).toBe(1);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(driver.execute).toHaveBeenCalledWith(expect.objectContaining({
      capability: 'fix',
      platform: 'api',
    }));
  });

  it('returns skipped when no actionable findings', async () => {
    const findings: ReviewFinding[] = [
      { reviewer: 'r', severity: 'info', category: 'note', message: 'just info' },
    ];
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver();
    const result = await runFixAttempt(driver, findings, ['error'], graph, 1);
    expect(result.status).toBe('skipped');
    expect(result.findingsAddressed).toBe(0);
    expect(driver.execute).not.toHaveBeenCalled();
  });

  it('returns error status on driver failure', async () => {
    const findings: ReviewFinding[] = [
      { reviewer: 'r', severity: 'error', category: 'x', message: 'bad' },
    ];
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver('error');
    const result = await runFixAttempt(driver, findings, ['error'], graph, 2);
    expect(result.status).toBe('error');
    expect(result.findingsAddressed).toBe(0);
    expect(result.iteration).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// runReviewFixLoopAsync
// ---------------------------------------------------------------------------

describe('runReviewFixLoopAsync', () => {
  function makeDriver(status: AgentResponse['status'] = 'success'): AgentDriver {
    return {
      platform: 'api',
      execute: vi.fn(async () => ({
        content: 'fixed code',
        status,
        metadata: { platform: 'api' as const, duration_ms: 50, tokens_used: 20, model: 'gpt-4o' },
      })),
    };
  }

  const defaultFixConfig = { maxIterations: 3, fixSeverity: ['critical' as const, 'error' as const], parallel: false };

  it('accepts immediately when no errors', async () => {
    const cleanReviewer: ReviewerAgent = {
      name: 'clean',
      description: 'test',
      review: () => [],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver();
    const cycles = await runReviewFixLoopAsync([cleanReviewer], { clean: ENABLED }, graph, makeSpec(), defaultFixConfig, driver);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.accepted).toBe(true);
    expect(cycles[0]!.fixAttempt).toBeNull();
    expect(driver.execute).not.toHaveBeenCalled();
  });

  it('attempts fix when errors found', async () => {
    const failReviewer: ReviewerAgent = {
      name: 'fail',
      description: 'test',
      review: () => [{ reviewer: 'fail', severity: 'error', category: 'x', message: 'bad' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver();
    const cycles = await runReviewFixLoopAsync([failReviewer], { fail: ENABLED }, graph, makeSpec(), defaultFixConfig, driver);
    expect(cycles).toHaveLength(3);
    expect(cycles[0]!.fixAttempt).not.toBeNull();
    expect(cycles[0]!.fixAttempt!.status).toBe('success');
    expect(driver.execute).toHaveBeenCalledTimes(3);
  });

  it('records fix error status', async () => {
    const failReviewer: ReviewerAgent = {
      name: 'fail',
      description: 'test',
      review: () => [{ reviewer: 'fail', severity: 'error', category: 'x', message: 'bad' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver('error');
    const cycles = await runReviewFixLoopAsync([failReviewer], { fail: ENABLED }, graph, makeSpec(), { ...defaultFixConfig, maxIterations: 1 }, driver);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.fixAttempt!.status).toBe('error');
    expect(cycles[0]!.fixAttempt!.findingsAddressed).toBe(0);
  });

  it('respects single iteration limit', async () => {
    const failReviewer: ReviewerAgent = {
      name: 'fail',
      description: 'test',
      review: () => [{ reviewer: 'fail', severity: 'error', category: 'x', message: 'bad' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver();
    const cycles = await runReviewFixLoopAsync([failReviewer], { fail: ENABLED }, graph, makeSpec(), { ...defaultFixConfig, maxIterations: 1 }, driver);
    expect(cycles).toHaveLength(1);
    expect(driver.execute).toHaveBeenCalledTimes(1);
  });

  it('only fixes configured severity levels', async () => {
    const warnOnlyReviewer: ReviewerAgent = {
      name: 'warn',
      description: 'test',
      review: () => [{ reviewer: 'warn', severity: 'warning', category: 'style', message: 'warn only' }],
    };
    const graph = makeGraph([makeModule('core', [])]);
    const driver = makeDriver();
    // fixSeverity only includes critical/error, not warning — so warnings accepted immediately
    const cycles = await runReviewFixLoopAsync([warnOnlyReviewer], { warn: ENABLED }, graph, makeSpec(), defaultFixConfig, driver);
    // No error/critical → accepted
    expect(cycles).toHaveLength(1);
    expect(cycles[0]!.accepted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Adversarial reviewer
// ---------------------------------------------------------------------------

describe('adversarialReviewer', () => {
  it('has correct name', () => {
    expect(adversarialReviewer.name).toBe('adversarial');
  });

  it('warns about modules with entities but no policies', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.user', kind: 'entity', name: 'user' }]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_policies')).toBe(true);
  });

  it('does not warn when module has policies', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.user', kind: 'entity', name: 'user' },
        { id: 'core.policy.validate', kind: 'policy', name: 'validate' },
      ]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_policies')).toBe(false);
  });

  it('does not warn about policies when module has rules', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.user', kind: 'entity', name: 'user' },
        { id: 'core.rule.validate', kind: 'rule', name: 'validate' },
      ]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_policies')).toBe(false);
  });

  it('warns about modules without tests', () => {
    const graph = makeGraph([makeModule('core', [{ id: 'core.entity.x', kind: 'entity', name: 'x' }])]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tests')).toBe(true);
  });

  it('does not warn when module has tests', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.test.t1', kind: 'test', name: 't1' }]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_tests')).toBe(false);
  });

  it('warns about orphan entities', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.x', kind: 'entity', name: 'x' }]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'orphan_entity')).toBe(true);
  });

  it('does not flag entities with edges', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.entity.x', kind: 'entity', name: 'x' }])],
      [{ from: 'core.workflow.w', to: 'core.entity.x', kind: 'reads' }],
    );
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'orphan_entity')).toBe(false);
  });

  it('warns about workflows without output edges', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.workflow.w', kind: 'workflow', name: 'w' }]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_output')).toBe(true);
  });

  it('does not warn when workflow has emits edge', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.workflow.w', kind: 'workflow', name: 'w' }])],
      [{ from: 'core.workflow.w', to: 'core.event.e', kind: 'emits' }],
    );
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_output')).toBe(false);
  });

  it('detects duplicate names within a module', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.item', kind: 'entity', name: 'item' },
        { id: 'core.workflow.item', kind: 'workflow', name: 'item' },
      ]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'duplicate_name')).toBe(true);
  });

  it('does not flag unique names', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.user', kind: 'entity', name: 'user' },
        { id: 'core.workflow.create', kind: 'workflow', name: 'create' },
      ]),
    ]);
    const findings = adversarialReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'duplicate_name')).toBe(false);
  });

  it('is disabled by default in config', () => {
    const configs = defaultConfigs();
    const graph = makeGraph([makeModule('core')]);
    const results = runReviewers([adversarialReviewer], configs, graph, makeSpec());
    expect(results).toHaveLength(0);
  });

  it('runs when explicitly enabled', () => {
    const configs = { adversarial: ENABLED };
    const graph = makeGraph([makeModule('core')]);
    const results = runReviewers([adversarialReviewer], configs, graph, makeSpec());
    expect(results).toHaveLength(1);
    expect(results[0]!.reviewer).toBe('adversarial');
  });
});

// ---------------------------------------------------------------------------
// Edge case reviewer
// ---------------------------------------------------------------------------

describe('edgeCaseReviewer', () => {
  it('has correct name', () => {
    expect(edgeCaseReviewer.name).toBe('edgeCase');
  });

  it('warns about entities with no fields', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item' }]),
    ]);
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'empty_entity')).toBe(true);
  });

  it('does not warn when entity has fields', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.item', kind: 'entity', name: 'item', fields: ['id: Int', 'name: String'] }]),
    ]);
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'empty_entity')).toBe(false);
  });

  it('warns about workflows that read but have no error path', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.workflow.w', kind: 'workflow', name: 'w' }])],
      [{ from: 'core.workflow.w', to: 'core.entity.x', kind: 'reads' }],
    );
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_error_path')).toBe(true);
  });

  it('does not warn when workflow has emits edge', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.workflow.w', kind: 'workflow', name: 'w' }])],
      [
        { from: 'core.workflow.w', to: 'core.entity.x', kind: 'reads' },
        { from: 'core.workflow.w', to: 'core.event.err', kind: 'emits' },
      ],
    );
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'missing_error_path')).toBe(false);
  });

  it('warns about single-entity modules with no workflows', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.entity.x', kind: 'entity', name: 'x' }]),
    ]);
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'single_entity_no_workflow')).toBe(true);
  });

  it('does not flag modules with workflows', () => {
    const graph = makeGraph([
      makeModule('core', [
        { id: 'core.entity.x', kind: 'entity', name: 'x' },
        { id: 'core.workflow.w', kind: 'workflow', name: 'w' },
      ]),
    ]);
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'single_entity_no_workflow')).toBe(false);
  });

  it('warns about dead events', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.event.e', kind: 'event', name: 'e' }])],
      [{ from: 'core.workflow.w', to: 'core.event.e', kind: 'emits' }],
    );
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'dead_event')).toBe(true);
  });

  it('does not flag events with subscribers', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.event.e', kind: 'event', name: 'e' }])],
      [
        { from: 'core.workflow.w', to: 'core.event.e', kind: 'emits' },
        { from: 'core.workflow.w2', to: 'core.event.e', kind: 'triggers_on' },
      ],
    );
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'dead_event')).toBe(false);
  });

  it('warns about unused actors', () => {
    const graph = makeGraph([
      makeModule('core', [{ id: 'core.actor.admin', kind: 'actor', name: 'admin' }]),
    ]);
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'unused_actor')).toBe(true);
  });

  it('does not flag actors with authorization edges', () => {
    const graph = makeGraph(
      [makeModule('core', [{ id: 'core.actor.admin', kind: 'actor', name: 'admin' }])],
      [{ from: 'core.workflow.w', to: 'core.actor.admin', kind: 'authorized_as' }],
    );
    const findings = edgeCaseReviewer.review(graph, makeSpec());
    expect(findings.some((f) => f.category === 'unused_actor')).toBe(false);
  });

  it('is disabled by default in config', () => {
    const configs = defaultConfigs();
    const graph = makeGraph([makeModule('core')]);
    const results = runReviewers([edgeCaseReviewer], configs, graph, makeSpec());
    expect(results).toHaveLength(0);
  });

  it('runs when explicitly enabled', () => {
    const configs = { edgeCase: ENABLED };
    const graph = makeGraph([makeModule('core')]);
    const results = runReviewers([edgeCaseReviewer], configs, graph, makeSpec());
    expect(results).toHaveLength(1);
    expect(results[0]!.reviewer).toBe('edgeCase');
  });
});
