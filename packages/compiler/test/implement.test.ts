// ---------------------------------------------------------------------------
// Implementation Phase Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';
import {
  buildImplementTasks,
  buildImplementPrompt,
  executeImplementation,
  extractSeams,
  applySeams,
  extractCodeBlocks,
  writeImplementationOutput,
} from '../src/implement/implement.js';
import type { ImplementTask, ImplementPrompt, CodeBlock } from '../src/implement/types.js';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ProductGraph } from '../src/graph/graph-types.js';
import type { IncrementalSpec } from '../src/incremental/types.js';
import type { AgentDriver, AgentResponse } from '../src/agent/types.js';
import type { GovernanceRule } from '../src/governance/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeGraph(): ProductGraph {
  return {
    format: 'prodara-product-graph',
    version: '0.1.0',
    product: { id: 'product', kind: 'product', name: 'TestApp', title: 'Test', version: '0.1', modules: ['core'], publishes: null },
    modules: [{
      id: 'mod_core',
      kind: 'module' as const,
      name: 'core',
      imports: [],
      entities: [{
        id: 'ent_user',
        kind: 'entity',
        name: 'user',
        fields: [
          { name: 'id', type: 'uuid' },
          { name: 'email', type: 'string' },
          { name: 'role', type: { ref: 'role_admin' } },
          { name: 'tags', type: { generic: 'list', arg: 'string' } },
        ],
      }],
      workflows: [{
        id: 'wf_register',
        kind: 'workflow',
        name: 'register',
      }],
    }],
    edges: [
      { from: 'ent_user', to: 'wf_register', kind: 'triggers' },
      { from: 'wf_register', to: 'ent_user', kind: 'creates' },
    ],
    metadata: { compiler: '0.1.0', compiled_at: '2026-03-19T00:00:00Z', source_files: ['app.prd'] },
  } as unknown as ProductGraph;
}

function makeSpec(tasks?: { taskId: string; nodeId: string; action: string; reason: string }[]): IncrementalSpec {
  const defaultTasks = [
    { taskId: 't1', nodeId: 'ent_user', action: 'generate' as const, reason: 'new entity' },
    { taskId: 't2', nodeId: 'wf_register', action: 'regenerate' as const, reason: 'workflow changed' },
  ];
  return {
    format: 'prodara-incremental-spec',
    version: '0.1.0',
    changes: [],
    impacts: [],
    tasks: tasks ?? defaultTasks,
    slices: {},
    summary: { addedCount: 1, removedCount: 0, modifiedCount: 1, impactedCount: 0, taskCount: 2, affectedModules: ['core'] },
  } as unknown as IncrementalSpec;
}

function makeDriver(responses?: AgentResponse[]): AgentDriver {
  let callIdx = 0;
  const defaultResponse: AgentResponse = {
    content: 'generated code',
    status: 'success',
    metadata: { platform: 'api', duration_ms: 100, tokens_used: 50, model: 'gpt-4o' },
  };
  return {
    platform: 'api',
    execute: vi.fn(async () => {
      const resp = responses ? responses[callIdx] ?? defaultResponse : defaultResponse;
      callIdx++;
      return resp;
    }),
  };
}

// ---------------------------------------------------------------------------
// buildImplementTasks
// ---------------------------------------------------------------------------

describe('buildImplementTasks', () => {
  it('builds tasks from spec with node metadata', () => {
    const graph = makeGraph();
    const spec = makeSpec();
    const tasks = buildImplementTasks(graph, spec);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]!.taskId).toBe('t1');
    expect(tasks[0]!.nodeId).toBe('ent_user');
    expect(tasks[0]!.nodeKind).toBe('entity');
    expect(tasks[0]!.module).toBe('core');
    expect(tasks[0]!.action).toBe('generate');
    expect(tasks[0]!.relatedEdges).toHaveLength(2);
    expect(tasks[0]!.fieldDefinitions).toContain('id: uuid');
    expect(tasks[0]!.fieldDefinitions).toContain('email: string');
  });

  it('extracts ref and generic field types', () => {
    const graph = makeGraph();
    const spec = makeSpec([{ taskId: 't1', nodeId: 'ent_user', action: 'generate', reason: 'new' }]);
    const tasks = buildImplementTasks(graph, spec);
    expect(tasks[0]!.fieldDefinitions).toContain('role: ref(role_admin)');
    expect(tasks[0]!.fieldDefinitions).toContain('tags: list<string>');
  });

  it('handles unknown node IDs gracefully', () => {
    const graph = makeGraph();
    const spec = makeSpec([{ taskId: 't1', nodeId: 'nonexistent', action: 'generate', reason: 'test' }]);
    const tasks = buildImplementTasks(graph, spec);
    expect(tasks[0]!.nodeKind).toBe('unknown');
    expect(tasks[0]!.module).toBe('');
    expect(tasks[0]!.fieldDefinitions).toHaveLength(0);
    expect(tasks[0]!.relatedEdges).toHaveLength(0);
  });

  it('includes related edges for node', () => {
    const graph = makeGraph();
    const spec = makeSpec([{ taskId: 't1', nodeId: 'ent_user', action: 'generate', reason: 'test' }]);
    const tasks = buildImplementTasks(graph, spec);
    expect(tasks[0]!.relatedEdges[0]).toContain('ent_user');
    expect(tasks[0]!.relatedEdges[0]).toContain('triggers');
  });

  it('handles nodes without fields', () => {
    const graph = makeGraph();
    const spec = makeSpec([{ taskId: 't1', nodeId: 'wf_register', action: 'generate', reason: 'test' }]);
    const tasks = buildImplementTasks(graph, spec);
    expect(tasks[0]!.fieldDefinitions).toHaveLength(0);
    expect(tasks[0]!.nodeKind).toBe('workflow');
    expect(tasks[0]!.module).toBe('core');
  });

  it('handles field with unknown type shape', () => {
    const graph = makeGraph();
    // Add a field with a non-standard type object (not ref, not generic)
    const mod = graph.modules[0] as Record<string, unknown>;
    (mod['entities'] as Record<string, unknown>[])[0]!['fields'] = [
      { name: 'weird', type: { custom: true } },
    ];
    // Add a non-array module property to cover the !Array.isArray branch
    mod['description'] = 'a scalar property';
    const spec = makeSpec([{ taskId: 't1', nodeId: 'ent_user', action: 'generate', reason: 'test' }]);
    const tasks = buildImplementTasks(graph, spec);
    expect(tasks[0]!.fieldDefinitions).toContain('weird: unknown');
  });

  it('formats edge text correctly', () => {
    const graph = makeGraph();
    const spec = makeSpec([{ taskId: 't1', nodeId: 'ent_user', action: 'generate', reason: 'test' }]);
    const tasks = buildImplementTasks(graph, spec);
    // Two edges: ent_user -[triggers]-> wf_register, wf_register -[creates]-> ent_user
    expect(tasks[0]!.relatedEdges).toEqual([
      'ent_user -[triggers]-> wf_register',
      'wf_register -[creates]-> ent_user',
    ]);
  });
});

// ---------------------------------------------------------------------------
// buildImplementPrompt
// ---------------------------------------------------------------------------

describe('buildImplementPrompt', () => {
  it('generates prompt with all sections', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate',
      nodeKind: 'entity', context: 'new entity added',
      relatedEdges: ['ent_user -[triggers]-> wf_register'],
      fieldDefinitions: ['id: uuid', 'email: string'],
    };
    const rules: GovernanceRule[] = [{ category: 'convention', rule: 'use strict mode' }];
    const prompt = buildImplementPrompt(task, makeGraph(), 'Be helpful', rules);

    expect(prompt.taskId).toBe('t1');
    expect(prompt.action).toBe('generate');
    expect(prompt.prompt).toContain('# Implementation Task: t1');
    expect(prompt.prompt).toContain('entity');
    expect(prompt.prompt).toContain('core');
    expect(prompt.prompt).toContain('new entity added');
    expect(prompt.prompt).toContain('## Field Definitions');
    expect(prompt.prompt).toContain('id: uuid');
    expect(prompt.prompt).toContain('## Related Edges');
    expect(prompt.prompt).toContain('ent_user -[triggers]-> wf_register');
    expect(prompt.prompt).toContain('## Governance Rules');
    expect(prompt.prompt).toContain('[convention] use strict mode');
    expect(prompt.graphSlice).toContain('core');
  });

  it('includes seam preservation note for regenerate tasks', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'regenerate',
      nodeKind: 'entity', context: 'changed', relatedEdges: [], fieldDefinitions: [],
    };
    const prompt = buildImplementPrompt(task, makeGraph(), null, []);
    expect(prompt.prompt).toContain('## Seam Preservation');
    expect(prompt.prompt).toContain('PRODARA SEAM START');
  });

  it('omits seam section for generate tasks', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate',
      nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [],
    };
    const prompt = buildImplementPrompt(task, makeGraph(), null, []);
    expect(prompt.prompt).not.toContain('Seam Preservation');
  });

  it('omits field/edge/governance sections when empty', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate',
      nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [],
    };
    const prompt = buildImplementPrompt(task, makeGraph(), null, []);
    expect(prompt.prompt).not.toContain('## Field Definitions');
    expect(prompt.prompt).not.toContain('## Related Edges');
    expect(prompt.prompt).not.toContain('## Governance Rules');
  });

  it('handles unknown module in graph slice', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'nonexistent', module: 'unknown', action: 'generate',
      nodeKind: 'unknown', context: 'test', relatedEdges: [], fieldDefinitions: [],
    };
    const prompt = buildImplementPrompt(task, makeGraph(), null, []);
    expect(prompt.graphSlice).toBe('{}');
  });

  it('includes context section', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate',
      nodeKind: 'entity', context: 'entity was modified',
      relatedEdges: [], fieldDefinitions: [],
    };
    const prompt = buildImplementPrompt(task, makeGraph(), null, []);
    expect(prompt.prompt).toContain('## Context');
    expect(prompt.prompt).toContain('entity was modified');
  });

  it('includes graph slice with edges for known module', () => {
    const task: ImplementTask = {
      taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate',
      nodeKind: 'entity', context: 'test', relatedEdges: [], fieldDefinitions: [],
    };
    const prompt = buildImplementPrompt(task, makeGraph(), null, []);
    const slice = JSON.parse(prompt.graphSlice);
    expect(slice.module).toBe('core');
    expect(slice.nodeId).toBe('ent_user');
    expect(slice.edges).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// executeImplementation
// ---------------------------------------------------------------------------

describe('executeImplementation', () => {
  function makePrompt(taskId: string, nodeId: string, action: ImplementPrompt['action'] = 'generate'): ImplementPrompt {
    return { taskId, nodeId, action, prompt: 'do it', graphSlice: '{}' };
  }

  it('executes tasks and collects results', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user')];
    const driver = makeDriver();

    const result = await executeImplementation(tasks, prompts, driver, 'be helpful', 'rules');
    expect(result.ok).toBe(true);
    expect(result.totalGenerated).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(result.totalSkipped).toBe(0);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]!.status).toBe('success');
    expect(result.tasks[0]!.platform).toBe('api');
  });

  it('skips verify tasks', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'verify', nodeKind: 'entity', context: 'unchanged', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user', 'verify')];
    const driver = makeDriver();

    const result = await executeImplementation(tasks, prompts, driver, null, null);
    expect(result.totalSkipped).toBe(1);
    expect(result.totalGenerated).toBe(0);
    expect(result.tasks[0]!.status).toBe('skipped');
    expect(result.tasks[0]!.duration_ms).toBe(0);
  });

  it('skips remove tasks', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'remove', nodeKind: 'entity', context: 'deleted', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user', 'remove')];
    const driver = makeDriver();

    const result = await executeImplementation(tasks, prompts, driver, null, null);
    expect(result.totalSkipped).toBe(1);
    expect(result.tasks[0]!.status).toBe('skipped');
  });

  it('counts failed tasks', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user')];
    const errorResponse: AgentResponse = {
      content: 'error',
      status: 'error',
      metadata: { platform: 'api', duration_ms: 50, tokens_used: null, model: null },
    };
    const driver = makeDriver([errorResponse]);

    const result = await executeImplementation(tasks, prompts, driver, null, null);
    expect(result.ok).toBe(false);
    expect(result.totalFailed).toBe(1);
    expect(result.tasks[0]!.status).toBe('error');
  });

  it('skips prompt with no matching task', async () => {
    const tasks: ImplementTask[] = [];
    const prompts = [makePrompt('orphan', 'x')];
    const driver = makeDriver();

    const result = await executeImplementation(tasks, prompts, driver, null, null);
    expect(result.totalSkipped).toBe(1);
    expect(result.tasks[0]!.status).toBe('skipped');
  });

  it('handles multiple tasks with mixed outcomes', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'n1', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
      { taskId: 't2', nodeId: 'n2', module: 'core', action: 'verify', nodeKind: 'entity', context: 'check', relatedEdges: [], fieldDefinitions: [] },
      { taskId: 't3', nodeId: 'n3', module: 'core', action: 'regenerate', nodeKind: 'entity', context: 'changed', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [
      makePrompt('t1', 'n1'),
      makePrompt('t2', 'n2', 'verify'),
      makePrompt('t3', 'n3', 'regenerate'),
    ];
    const driver = makeDriver();

    const result = await executeImplementation(tasks, prompts, driver, null, null);
    expect(result.totalGenerated).toBe(2); // t1 + t3
    expect(result.totalSkipped).toBe(1);   // t2 (verify)
    expect(result.totalFailed).toBe(0);
    expect(result.ok).toBe(true);
  });

  it('passes correct request shape to driver', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user')];
    const driver = makeDriver();

    await executeImplementation(tasks, prompts, driver, 'constitution text', 'gov rules');
    expect(driver.execute).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'do it',
      capability: 'implement',
      platform: 'api',
      context: expect.objectContaining({
        constitution: 'constitution text',
        governance: 'gov rules',
        graphSlice: '{}',
      }),
    }));
  });

  it('skips tasks in dryRun mode', async () => {
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user')];
    const driver = makeDriver();

    const result = await executeImplementation(tasks, prompts, driver, null, null, { dryRun: true });
    expect(result.totalSkipped).toBe(1);
    expect(result.totalGenerated).toBe(0);
    expect(result.tasks[0]!.status).toBe('skipped');
    expect(driver.execute).not.toHaveBeenCalled();
  });

  it('writes code blocks to disk in API mode with root', async () => {
    const testRoot = join(tmpdir(), `prodara-exec-test-${Date.now()}`);
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user')];
    const codeResponse: AgentResponse = {
      content: '```ts\n// filename: src/core/user.ts\nexport class User {}\n```',
      status: 'success',
      metadata: { platform: 'api', duration_ms: 50, tokens_used: 10, model: 'gpt-4o' },
    };
    const driver = makeDriver([codeResponse]);

    const result = await executeImplementation(tasks, prompts, driver, null, null, { root: testRoot });
    expect(result.totalGenerated).toBe(1);
    expect(result.tasks[0]!.outputPath).toContain('user.ts');
    const content = readFileSync(result.tasks[0]!.outputPath!, 'utf-8');
    expect(content).toContain('export class User');
  });

  it('handles API mode with root when response has no code blocks', async () => {
    const testRoot = join(tmpdir(), `prodara-exec-nocode-${Date.now()}`);
    const tasks: ImplementTask[] = [
      { taskId: 't1', nodeId: 'ent_user', module: 'core', action: 'generate', nodeKind: 'entity', context: 'new', relatedEdges: [], fieldDefinitions: [] },
    ];
    const prompts = [makePrompt('t1', 'ent_user')];
    const textResponse: AgentResponse = {
      content: 'Here is a description without any code blocks.',
      status: 'success',
      metadata: { platform: 'api', duration_ms: 30, tokens_used: 5, model: 'gpt-4o' },
    };
    const driver = makeDriver([textResponse]);

    const result = await executeImplementation(tasks, prompts, driver, null, null, { root: testRoot });
    expect(result.totalGenerated).toBe(1);
    expect(result.tasks[0]!.outputPath).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractSeams
// ---------------------------------------------------------------------------

describe('extractSeams', () => {
  it('extracts seam ranges from content', () => {
    const content = [
      'line 0',
      '// PRODARA SEAM START custom-auth',
      '  const auth = true;',
      '  doStuff();',
      '// PRODARA SEAM END custom-auth',
      'line 5',
    ].join('\n');

    const seams = extractSeams(content);
    expect(seams).toHaveLength(1);
    expect(seams[0]!.id).toBe('custom-auth');
    expect(seams[0]!.startLine).toBe(1);
    expect(seams[0]!.endLine).toBe(4);
    expect(seams[0]!.content).toBe('  const auth = true;\n  doStuff();');
  });

  it('extracts multiple seams', () => {
    const content = [
      '// PRODARA SEAM START a',
      'code a',
      '// PRODARA SEAM END a',
      '// PRODARA SEAM START b',
      'code b',
      '// PRODARA SEAM END b',
    ].join('\n');

    const seams = extractSeams(content);
    expect(seams).toHaveLength(2);
    expect(seams[0]!.id).toBe('a');
    expect(seams[0]!.content).toBe('code a');
    expect(seams[1]!.id).toBe('b');
    expect(seams[1]!.content).toBe('code b');
  });

  it('returns empty for no seams', () => {
    expect(extractSeams('plain code\nno seams')).toHaveLength(0);
  });

  it('handles empty seam content', () => {
    const content = '// PRODARA SEAM START empty\n// PRODARA SEAM END empty';
    const seams = extractSeams(content);
    expect(seams).toHaveLength(1);
    expect(seams[0]!.content).toBe('');
  });

  it('handles empty string', () => {
    expect(extractSeams('')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applySeams
// ---------------------------------------------------------------------------

describe('applySeams', () => {
  it('restores preserved seam content into regenerated output', () => {
    const saved = extractSeams([
      '// PRODARA SEAM START auth',
      '  const myAuth = custom();',
      '// PRODARA SEAM END auth',
    ].join('\n'));

    const newContent = [
      'import stuff;',
      '// PRODARA SEAM START auth',
      '  // default auth code',
      '// PRODARA SEAM END auth',
      'export stuff;',
    ].join('\n');

    const result = applySeams(newContent, saved);
    expect(result).toContain('const myAuth = custom()');
    expect(result).not.toContain('default auth code');
    expect(result).toContain('import stuff');
    expect(result).toContain('export stuff');
  });

  it('returns content unchanged when no seams saved', () => {
    const content = 'plain code';
    expect(applySeams(content, [])).toBe('plain code');
  });

  it('preserves seam markers when no saved match', () => {
    const newContent = [
      '// PRODARA SEAM START unknown',
      '  new code',
      '// PRODARA SEAM END unknown',
    ].join('\n');

    const result = applySeams(newContent, []);
    expect(result).toContain('new code');
    expect(result).toContain('PRODARA SEAM START');
    expect(result).toContain('PRODARA SEAM END');
  });

  it('handles multiple seams', () => {
    const saved = extractSeams([
      '// PRODARA SEAM START a',
      'saved a',
      '// PRODARA SEAM END a',
      '// PRODARA SEAM START b',
      'saved b',
      '// PRODARA SEAM END b',
    ].join('\n'));

    const newContent = [
      '// PRODARA SEAM START a',
      'default a',
      '// PRODARA SEAM END a',
      'middle',
      '// PRODARA SEAM START b',
      'default b',
      '// PRODARA SEAM END b',
    ].join('\n');

    const result = applySeams(newContent, saved);
    expect(result).toContain('saved a');
    expect(result).toContain('saved b');
    expect(result).not.toContain('default a');
    expect(result).not.toContain('default b');
    expect(result).toContain('middle');
  });

  it('preserves non-seam lines unchanged', () => {
    const newContent = 'line 1\nline 2\nline 3';
    const result = applySeams(newContent, []);
    expect(result).toBe('line 1\nline 2\nline 3');
  });

  it('keeps default content when seam ID is not in saved set', () => {
    const saved = [{ id: 'other', startLine: 0, endLine: 2, content: 'other code' }];
    const newContent = [
      '// PRODARA SEAM START unmatched',
      '  default code here',
      '// PRODARA SEAM END unmatched',
    ].join('\n');

    const result = applySeams(newContent, saved);
    expect(result).toContain('default code here');
    expect(result).toContain('PRODARA SEAM START unmatched');
  });
});

// ---------------------------------------------------------------------------
// extractCodeBlocks
// ---------------------------------------------------------------------------

describe('extractCodeBlocks', () => {
  it('extracts a single fenced code block', () => {
    const response = '```ts\nconst x = 1;\n```';
    const blocks = extractCodeBlocks(response);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.language).toBe('ts');
    expect(blocks[0]!.content).toBe('const x = 1;');
    expect(blocks[0]!.filename).toBeNull();
  });

  it('extracts multiple code blocks', () => {
    const response = 'Some text\n```typescript\nfoo();\n```\nMore text\n```javascript\nbar();\n```';
    const blocks = extractCodeBlocks(response);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.language).toBe('typescript');
    expect(blocks[1]!.language).toBe('javascript');
  });

  it('parses filename hints', () => {
    const response = '```ts\n// filename: src/utils.ts\nexport function greet() {}\n```';
    const blocks = extractCodeBlocks(response);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.filename).toBe('src/utils.ts');
  });

  it('defaults language to text when absent', () => {
    const response = '```\nplain content\n```';
    const blocks = extractCodeBlocks(response);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.language).toBe('text');
  });

  it('skips empty code blocks', () => {
    const response = '```ts\n   \n```';
    const blocks = extractCodeBlocks(response);
    expect(blocks).toHaveLength(0);
  });

  it('returns empty array for no code blocks', () => {
    const blocks = extractCodeBlocks('just some text\nno blocks here');
    expect(blocks).toHaveLength(0);
  });

  it('handles unclosed code block', () => {
    const response = '```ts\nconst x = 1;';
    const blocks = extractCodeBlocks(response);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.content).toBe('const x = 1;');
  });
});

// ---------------------------------------------------------------------------
// writeImplementationOutput
// ---------------------------------------------------------------------------

describe('writeImplementationOutput', () => {
  const TEST_ROOT = join(tmpdir(), `prodara-impl-test-${Date.now()}`);
  const task: ImplementTask = {
    taskId: 't1',
    nodeId: 'user',
    module: 'core',
    action: 'generate' as const,
    nodeKind: 'entity',
    context: 'new',
    relatedEdges: [],
    fieldDefinitions: [],
  };

  it('writes block with filename hint', () => {
    const blocks: CodeBlock[] = [{ language: 'ts', filename: 'src/core/user.ts', content: 'export class User {}' }];
    const written = writeImplementationOutput(blocks, TEST_ROOT, task);
    expect(written).toHaveLength(1);
    expect(written[0]).toContain('user.ts');
    const content = readFileSync(written[0]!, 'utf-8');
    expect(content).toBe('export class User {}');
  });

  it('derives path from task when no filename hint', () => {
    const blocks: CodeBlock[] = [{ language: 'typescript', filename: null, content: 'code here' }];
    const written = writeImplementationOutput(blocks, TEST_ROOT, task);
    expect(written).toHaveLength(1);
    expect(written[0]).toContain(join('src', 'core', 'user.ts'));
  });

  it('appends suffix for multiple blocks without filenames', () => {
    const blocks: CodeBlock[] = [
      { language: 'ts', filename: null, content: 'block 0' },
      { language: 'ts', filename: null, content: 'block 1' },
    ];
    const written = writeImplementationOutput(blocks, TEST_ROOT, task);
    expect(written).toHaveLength(2);
    expect(written[0]).toContain('user-0.ts');
    expect(written[1]).toContain('user-1.ts');
  });

  it('uses language fallback extension for unknown languages', () => {
    const blocks: CodeBlock[] = [{ language: 'kotlin', filename: null, content: 'fun main()' }];
    const written = writeImplementationOutput(blocks, TEST_ROOT, task);
    expect(written[0]).toContain('.kotlin');
  });
});
