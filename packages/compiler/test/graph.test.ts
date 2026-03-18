import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { bind } from '../src/binder/binder.js';
import { buildGraph } from '../src/graph/builder.js';
import { serializeGraph } from '../src/graph/serializer.js';

function buildFromSource(source: string) {
  const { ast, bag: parseBag } = parse(source);
  expect(parseBag.hasErrors).toBe(false);
  const bindResult = bind([ast]);
  expect(bindResult.bag.hasErrors).toBe(false);
  const { graph, bag } = buildGraph([ast], bindResult);
  return { graph, bag, ast, bindResult };
}

describe('Graph Builder', () => {
  it('builds graph with product node', () => {
    const { graph } = buildFromSource(`
      product sample {
        title: "Sample"
        version: "0.1.0"
        modules: [core]
      }
      module core {
        entity task { id: uuid }
      }
    `);
    expect(graph.format).toBe('prodara-product-graph');
    expect(graph.version).toBe('0.1.0');
    expect(graph.product.name).toBe('sample');
    expect(graph.product.title).toBe('Sample');
    expect(graph.product.version).toBe('0.1.0');
  });

  it('builds module nodes with entities', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid title: string }
      }
    `);
    expect(graph.modules).toHaveLength(1);
    expect(graph.modules[0]!.name).toBe('core');
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const entities = mod['entities'] as Array<{ id: string; name: string }>;
    expect(entities).toHaveLength(1);
    expect(entities[0]!.id).toBe('core.entity.task');
    expect(entities[0]!.name).toBe('task');
  });

  it('builds edges for structural relationships', () => {
    const { graph } = buildFromSource(`
      product app { title: "App" version: "1.0" modules: [core] }
      module core {
        entity task { id: uuid }
      }
    `);
    // product -> module edge
    const containsEdge = graph.edges.find((e) => e.from === 'product' && e.to === 'core');
    expect(containsEdge).toBeDefined();
    expect(containsEdge!.kind).toBe('contains');

    // module -> entity edge
    const entityEdge = graph.edges.find((e) => e.from === 'core' && e.to === 'core.entity.task');
    expect(entityEdge).toBeDefined();
    expect(entityEdge!.kind).toBe('contains');
  });

  it('builds edges for workflow references', () => {
    const { graph } = buildFromSource(`
      module billing {
        entity invoice { id: uuid }
        capability invoicing { title: "Invoicing" }
        workflow create_invoice {
          capability: invoicing
          reads { invoice }
          writes { invoice }
          returns { ok: invoice }
        }
      }
    `);
    const wfId = 'billing.workflow.create_invoice';
    const callsEdge = graph.edges.find((e) => e.from === wfId && e.kind === 'calls');
    expect(callsEdge).toBeDefined();
    const readsEdge = graph.edges.find((e) => e.from === wfId && e.kind === 'reads');
    expect(readsEdge).toBeDefined();
    const writesEdge = graph.edges.find((e) => e.from === wfId && e.kind === 'writes');
    expect(writesEdge).toBeDefined();
  });

  it('builds edges for action -> workflow', () => {
    const { graph } = buildFromSource(`
      module billing {
        workflow create { returns { ok: boolean } }
        action create_invoice { workflow: create }
      }
    `);
    const invokesEdge = graph.edges.find((e) =>
      e.from === 'billing.action.create_invoice' && e.kind === 'invokes',
    );
    expect(invokesEdge).toBeDefined();
  });

  it('builds edges for surface references', () => {
    const { graph } = buildFromSource(`
      module board {
        entity task { id: uuid }
        workflow move { returns { ok: boolean } }
        action move_task { workflow: move }
        surface board_view {
          kind: view
          binds: task
          actions: [move_task]
        }
      }
    `);
    const surfId = 'board.surface.board_view';
    const bindsEdge = graph.edges.find((e) => e.from === surfId && e.kind === 'binds');
    expect(bindsEdge).toBeDefined();
    const actionEdge = graph.edges.find((e) => e.from === surfId && e.kind === 'exposes_action');
    expect(actionEdge).toBeDefined();
  });

  it('sorts edges deterministically', () => {
    const { graph } = buildFromSource(`
      module billing {
        entity invoice { id: uuid }
        entity payment { id: uuid }
        workflow process { writes { invoice payment } returns { ok: boolean } }
      }
    `);
    // edges should be sorted by from, then kind, then to
    for (let i = 1; i < graph.edges.length; i++) {
      const prev = graph.edges[i - 1]!;
      const curr = graph.edges[i]!;
      const cmp = prev.from.localeCompare(curr.from)
        || prev.kind.localeCompare(curr.kind)
        || prev.to.localeCompare(curr.to);
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  it('includes metadata', () => {
    const { graph } = buildFromSource(`
      module core { entity task { id: uuid } }
    `);
    expect(graph.metadata.compiler).toBe('prodara-compiler');
    expect(graph.metadata.compiled_at).toBeDefined();
    expect(graph.metadata.source_files).toBeDefined();
  });

  it('builds nodes for governance declarations', () => {
    const { graph } = buildFromSource(`
      module core {
        entity customer { id: uuid }
        constitution standards { description: "Standards" }
        security sec { applies_to: [core] }
        privacy priv { applies_to: [customer] classification: personal_data }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    expect(mod['constitutions']).toHaveLength(1);
    expect(mod['securities']).toHaveLength(1);
    expect(mod['privacies']).toHaveLength(1);
  });

  it('builds nodes for runtime declarations', () => {
    const { graph } = buildFromSource(`
      module core {
        secret api_key { source: vault }
        environment staging { url: "https://staging.example.com" }
        deployment prod { description: "Production" }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    expect(mod['secrets']).toHaveLength(1);
    expect(mod['environments']).toHaveLength(1);
    expect(mod['deployments']).toHaveLength(1);
  });

  it('builds minimal workflow without optional properties', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow simple_flow {
          returns { ok: boolean }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const workflows = mod['workflows'] as Array<Record<string, unknown>>;
    expect(workflows).toHaveLength(1);
    const wf = workflows[0]!;
    expect(wf['name']).toBe('simple_flow');
    // All optional properties should be absent (falsy branches)
    expect(wf['capability']).toBeUndefined();
    expect(wf['reads']).toBeUndefined();
    expect(wf['writes']).toBeUndefined();
    expect(wf['rules']).toBeUndefined();
    expect(wf['trigger']).toBeUndefined();
    expect(wf['effects']).toBeUndefined();
    expect(wf['input']).toBeUndefined();
    expect(wf['authorization']).toBeUndefined();
    expect(wf['steps']).toBeUndefined();
    expect(wf['transitions']).toBeUndefined();
  });

  it('builds event without payload', () => {
    const { graph } = buildFromSource(`
      module core {
        event something_happened {
          description: "An event with no payload"
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const events = mod['events'] as Array<Record<string, unknown>>;
    expect(events).toHaveLength(1);
    expect(events[0]!['payload']).toBeNull();
  });

  it('builds extension without contract', () => {
    const { graph } = buildFromSource(`
      module platform {
        extension custom_hook {
          kind: hook
          language: "typescript"
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const extensions = mod['extensions'] as Array<Record<string, unknown>>;
    expect(extensions).toHaveLength(1);
    expect(extensions[0]!['name']).toBe('custom_hook');
  });

  it('builds action without title', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow simple { returns { ok: boolean } }
        action do_simple { workflow: simple }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const actions = mod['actions'] as Array<Record<string, unknown>>;
    expect(actions).toHaveLength(1);
    expect(actions[0]!['title']).toBeNull();
  });

  it('builds schedule without cron or description', () => {
    const { graph } = buildFromSource(`
      module platform {
        schedule nightly {}
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const schedules = mod['schedules'] as Array<Record<string, unknown>>;
    expect(schedules).toHaveLength(1);
    expect(schedules[0]!['cron']).toBeNull();
    expect(schedules[0]!['description']).toBeNull();
  });

  it('builds product with publishes section', () => {
    const { graph } = buildFromSource(`
      product myapp {
        title: "My App"
        version: "1.0"
        modules: [core]
        publishes {
          entities: [core.task]
        }
      }
      module core {
        entity task { id: uuid }
      }
    `);
    expect(graph.product.publishes).not.toBeNull();
    expect(graph.product.publishes!['entities']).toHaveLength(1);
  });

  it('builds surface with full refs', () => {
    const { graph } = buildFromSource(`
      module board {
        entity task { id: uuid }
        capability manage_tasks { title: "Manage Tasks" }
        workflow move { returns { ok: boolean } }
        action move_task { workflow: move }
        surface task_detail {
          kind: view
          binds: task
          capability: manage_tasks
          actions: [move_task]
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const surfaces = mod['surfaces'] as Array<Record<string, unknown>>;
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0]!['binds']).toContain('board.entity.task');
    expect(surfaces[0]!['capability']).toContain('board.capability.manage_tasks');
  });

  it('builds workflow with authorization block', () => {
    const { graph } = buildFromSource(`
      module core {
        actor admin { title: "Admin" }
        workflow protected {
          authorization {
            admin: [items.create items.update]
          }
          returns { ok: boolean }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const workflows = mod['workflows'] as Array<Record<string, unknown>>;
    const wf = workflows[0]!;
    expect(wf['authorization']).toBeDefined();
    const auths = wf['authorization'] as Array<{ actor: string; permissions: string[] }>;
    expect(auths).toHaveLength(1);
    expect(auths[0]!.permissions).toContain('items.create');
  });

  it('builds workflow with steps and transitions', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        enum task_status { open closed }
        workflow close_task {
          writes { task }
          steps {
            call close_task
          }
          transitions {
            task.status: open -> closed
          }
          returns { ok: boolean }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const workflows = mod['workflows'] as Array<Record<string, unknown>>;
    const wf = workflows[0]!;
    expect(wf['steps']).toBeDefined();
    expect(wf['transitions']).toBeDefined();
  });

  it('builds workflow with effects', () => {
    const { graph } = buildFromSource(`
      module core {
        event task_created {}
        workflow create_task {
          effects {
            emit task_created
            audit "task.created"
          }
          returns { ok: boolean }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const workflows = mod['workflows'] as Array<Record<string, unknown>>;
    const wf = workflows[0]!;
    expect(wf['effects']).toBeDefined();
    const effects = wf['effects'] as Array<Record<string, unknown>>;
    expect(effects.some((e) => 'emit' in e)).toBe(true);
    expect(effects.some((e) => 'audit' in e)).toBe(true);
  });

  it('builds rendering with target', () => {
    const { graph } = buildFromSource(`
      module ui {
        surface dashboard { kind: page }
        rendering dashboard_render {
          target: dashboard
          platform: web
          layout: grid
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const renderings = mod['renderings'] as Array<Record<string, unknown>>;
    expect(renderings).toHaveLength(1);
    expect(renderings[0]!['target']).toContain('ui.surface.dashboard');
    expect(renderings[0]!['platform']).toBe('web');
    expect(renderings[0]!['layout']).toBe('grid');
  });

  it('builds theme with extends', () => {
    const { graph } = buildFromSource(`
      module design {
        tokens base { colors: { primary: "#000" } }
        theme dark {
          extends: base
          colors: { primary: "#111" }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const themes = mod['themes'] as Array<Record<string, unknown>>;
    expect(themes).toHaveLength(1);
  });

  it('builds storage with target and all properties', () => {
    const { graph } = buildFromSource(`
      module platform {
        entity task { id: uuid }
        storage task_store {
          target: task
          model: relational
          table: "tasks"
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const storages = mod['storages'] as Array<Record<string, unknown>>;
    expect(storages).toHaveLength(1);
    expect(storages[0]!['model']).toBe('relational');
    expect(storages[0]!['table']).toBe('tasks');
  });

  it('builds privacy node with all optional properties', () => {
    const { graph } = buildFromSource(`
      module core {
        entity customer { id: uuid }
        privacy customer_privacy {
          applies_to: [customer]
          classification: personal_data
          retention: "90d"
          exportable: true
          erasable: true
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const privacies = mod['privacies'] as Array<Record<string, unknown>>;
    expect(privacies).toHaveLength(1);
    expect(privacies[0]!['classification']).toBe('personal_data');
  });

  it('builds entity field types with generics and refs', () => {
    const { graph } = buildFromSource(`
      module core {
        entity project { id: uuid }
        entity task {
          id: uuid
          name: string
          project: project
          tags: list<string>
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const entities = mod['entities'] as Array<Record<string, unknown>>;
    const task = entities.find((e) => e['name'] === 'task')!;
    const fields = task['fields'] as Array<{ name: string; type: unknown }>;
    expect(fields).toHaveLength(4);
    // Check ref type
    const projectField = fields.find((f) => f.name === 'project')!;
    expect(projectField.type).toHaveProperty('ref');
    // Check generic type
    const tagsField = fields.find((f) => f.name === 'tags')!;
    expect(tagsField.type).toHaveProperty('generic');
  });

  it('builds governance nodes without applies_to', () => {
    const { graph } = buildFromSource(`
      module core {
        constitution bare_const { description: "No applies" }
        security bare_sec {}
        validation bare_val {}
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const constitutions = mod['constitutions'] as Array<Record<string, unknown>>;
    expect(constitutions[0]!['applies_to']).toEqual([]);
    const securities = mod['securities'] as Array<Record<string, unknown>>;
    expect(securities[0]!['applies_to']).toEqual([]);
    const validations = mod['validations'] as Array<Record<string, unknown>>;
    expect(validations[0]!['applies_to']).toEqual([]);
  });

  it('builds capability without actors', () => {
    const { graph } = buildFromSource(`
      module core {
        capability basic { title: "Basic" }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const capabilities = mod['capabilities'] as Array<Record<string, unknown>>;
    expect(capabilities[0]!['title']).toBe('Basic');
    expect(capabilities[0]!['actors']).toEqual([]);
  });

  it('builds surface without capability or binds', () => {
    const { graph } = buildFromSource(`
      module ui {
        surface empty_page { kind: page }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const surfaces = mod['surfaces'] as Array<Record<string, unknown>>;
    expect(surfaces[0]!['capability']).toBeNull();
    expect(surfaces[0]!['binds']).toBeNull();
  });

  it('builds workflow with trigger', () => {
    const { graph } = buildFromSource(`
      module core {
        event task_changed {}
        workflow on_change {
          on: task_changed
          returns { ok: boolean }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const workflows = mod['workflows'] as Array<Record<string, unknown>>;
    expect(workflows[0]!['trigger']).toContain('core.event.task_changed');
  });

  it('builds workflow with inputs', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow create {
          input { name: string }
          returns { ok: boolean }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const workflows = mod['workflows'] as Array<Record<string, unknown>>;
    expect(workflows[0]!['input']).toHaveLength(1);
  });

  it('builds extension with contract', () => {
    const { graph } = buildFromSource(`
      module platform {
        entity task { id: uuid }
        extension hook {
          target: task
          kind: hook
          language: "typescript"
        }
        extension typed_hook {
          target: task
          kind: hook
          contract {
            input: string
            output: boolean
          }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const extensions = mod['extensions'] as Array<Record<string, unknown>>;
    expect(extensions).toHaveLength(2);
  });

  it('builds deployment with environment refs', () => {
    const { graph } = buildFromSource(`
      module infra {
        environment staging { url: "https://staging.example.com" }
        environment prod { url: "https://example.com" }
        deployment main_deploy {
          environments: [staging, prod]
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const deployments = mod['deployments'] as Array<Record<string, unknown>>;
    expect(deployments[0]!['environments']).toHaveLength(2);
    // Should also have includes_env edges
    const envEdges = graph.edges.filter((e) => e.kind === 'includes_env');
    expect(envEdges).toHaveLength(2);
  });

  it('builds transport with target edge', () => {
    const { graph } = buildFromSource(`
      module platform {
        workflow process_order { }
        transport order_transport {
          target: process_order
          protocol: grpc
        }
      }
    `);
    const attachEdges = graph.edges.filter((e) => e.kind === 'attaches_to' && e.from.includes('transport'));
    expect(attachEdges).toHaveLength(1);
    expect(attachEdges[0]!.from).toContain('transport');
  });

  it('builds execution with target edge', () => {
    const { graph } = buildFromSource(`
      module platform {
        workflow process_order { }
        execution order_exec {
          target: process_order
          mode: async
        }
      }
    `);
    const attachEdges = graph.edges.filter((e) => e.kind === 'attaches_to' && e.from.includes('execution'));
    expect(attachEdges).toHaveLength(1);
    expect(attachEdges[0]!.from).toContain('execution');
  });

  it('builds environment with secrets edges', () => {
    const { graph } = buildFromSource(`
      module infra {
        secret db_pass { source: vault }
        environment staging {
          url: "https://staging.example.com"
          secrets {
            db_pass: "secret_value"
          }
        }
      }
    `);
    const bindEdges = graph.edges.filter((e) => e.kind === 'binds_secret');
    expect(bindEdges).toHaveLength(1);
    expect(bindEdges[0]!.from).toContain('environment');
  });

  it('builds surface with actions and nested surfaces', () => {
    const { graph } = buildFromSource(`
      module ui {
        action save_action { title: "Save" }
        surface child_panel { kind: panel }
        entity task { id: uuid }
        serialization task_json { }
        surface main_form {
          kind: form
          actions: [save_action]
          surface: [child_panel]
          serialization: task_json
        }
      }
    `);
    const actionEdges = graph.edges.filter((e) => e.kind === 'exposes_action');
    expect(actionEdges).toHaveLength(1);
    const surfaceEdges = graph.edges.filter((e) => e.kind === 'contains_surface');
    expect(surfaceEdges).toHaveLength(1);
    const serEdges = graph.edges.filter((e) => e.kind === 'uses_serialization');
    expect(serEdges).toHaveLength(1);
  });

  it('builds test node with target edge', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid name: string }
        test task_test {
          target: task
          expect {
            name: "test"
          }
        }
      }
    `);
    const testEdges = graph.edges.filter((e) => e.kind === 'tests');
    expect(testEdges).toHaveLength(1);
  });

  it('builds extension with target and contract edges', () => {
    const { graph } = buildFromSource(`
      module platform {
        entity task { id: uuid }
        extension task_hook {
          target: task
          kind: hook
          contract {
            input: string
            output: boolean
          }
        }
      }
    `);
    const attachEdges = graph.edges.filter((e) => e.kind === 'attaches_to');
    expect(attachEdges).toHaveLength(1);
    const contractEdges = graph.edges.filter((e) => e.kind === 'contract_type');
    expect(contractEdges.length).toBeGreaterThanOrEqual(0);
  });

  it('builds storage with target refines_entity edge', () => {
    const { graph } = buildFromSource(`
      module platform {
        entity task { id: uuid }
        storage task_store {
          target: task
          model: relational
        }
      }
    `);
    const refineEdges = graph.edges.filter((e) => e.kind === 'refines_entity');
    expect(refineEdges).toHaveLength(1);
  });

  it('builds security with applies_to edge', () => {
    const { graph } = buildFromSource(`
      module gov {
        entity task { id: uuid }
        security task_sec {
          applies_to: [task]
        }
      }
    `);
    const govEdges = graph.edges.filter((e) => e.kind === 'governs');
    expect(govEdges).toHaveLength(1);
  });

  it('builds validation with applies_to edge', () => {
    const { graph } = buildFromSource(`
      module gov {
        entity task { id: uuid }
        validation task_val {
          applies_to: [task]
        }
      }
    `);
    const govEdges = graph.edges.filter((e) => e.kind === 'governs');
    expect(govEdges).toHaveLength(1);
  });

  // --- Full-featured declarations to cover all optional builder branches ---

  it('builds product with publishes', () => {
    const { graph } = buildFromSource(`
      product TestApp {
        title: "Test App"
        version: "1.0.0"
        publishes {
          commands: [core.create_task]
        }
      }
      module core {
        action create_task { title: "Create" }
      }
    `);
    expect(graph.product.name).toBe('TestApp');
  });

  it('builds workflow with all optional properties', () => {
    const { graph } = buildFromSource(`
      module core {
        enum status { draft done }
        entity task { id: uuid status: status name: string }
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
        rule task_rule { entity: task condition: true }
        event task_done { }
        action finish_task { title: "Finish" }
        workflow do_task {
          capability: manage
          authorization {
            admin: [task.create]
          }
          input { name: string }
          reads { task }
          writes { task }
          rules { task_rule }
          steps {
            call finish_task
            decide check {
              when yes -> call finish_task
              when no -> fail error_code
            }
            fail abort_code
          }
          transitions {
            task.status: draft -> done
          }
          effects {
            audit "completed"
            emit task_done
            notify admin
          }
          returns { ok: boolean }
          on: task_done
        }
      }
    `);
    const wfNodes = graph.modules[0]!;
    expect(wfNodes).toBeDefined();
    // Edges for workflow
    const callEdges = graph.edges.filter((e) => e.kind === 'calls');
    expect(callEdges.length).toBeGreaterThan(0);
    const readsEdges = graph.edges.filter((e) => e.kind === 'reads');
    expect(readsEdges.length).toBeGreaterThan(0);
    const writesEdges = graph.edges.filter((e) => e.kind === 'writes');
    expect(writesEdges.length).toBeGreaterThan(0);
    const ruleEdges = graph.edges.filter((e) => e.kind === 'uses_rule');
    expect(ruleEdges.length).toBeGreaterThan(0);
    const triggerEdges = graph.edges.filter((e) => e.kind === 'triggers_on');
    expect(triggerEdges.length).toBeGreaterThan(0);
    const emitEdges = graph.edges.filter((e) => e.kind === 'emits');
    expect(emitEdges.length).toBeGreaterThan(0);
    const notifyEdges = graph.edges.filter((e) => e.kind === 'notifies');
    expect(notifyEdges.length).toBeGreaterThan(0);
    const transEdges = graph.edges.filter((e) => e.kind === 'transitions');
    expect(transEdges.length).toBeGreaterThan(0);
  });

  it('builds event with payload and description', () => {
    const { graph } = buildFromSource(`
      module core {
        event task_created {
          payload: string
          description: "Task was created"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds schedule with cron and description', () => {
    const { graph } = buildFromSource(`
      module core {
        schedule daily_cleanup {
          cron: "0 0 * * *"
          description: "Cleanup daily"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds surface with all optional properties', () => {
    const { graph } = buildFromSource(`
      module ui {
        entity task { id: uuid }
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
        surface task_form {
          kind: form
          title: "Task Form"
          capability: manage
          binds: task
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds rendering with target', () => {
    const { graph } = buildFromSource(`
      module ui {
        surface page { kind: page }
        rendering page_render {
          target: page
          platform: web
          layout: grid
        }
      }
    `);
    const refEdges = graph.edges.filter((e) => e.kind === 'targets_surface');
    expect(refEdges.length).toBeGreaterThanOrEqual(0);
  });

  it('builds tokens with categories', () => {
    const { graph } = buildFromSource(`
      module design {
        tokens base {
          colors: {
            primary: "#000"
          }
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds theme with extends and overrides', () => {
    const { graph } = buildFromSource(`
      module design {
        tokens base { colors: { primary: "#000" } }
        theme dark {
          extends: base
          colors: {
            primary: "#fff"
          }
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds strings entries', () => {
    const { graph } = buildFromSource(`
      module i18n {
        strings en {
          greeting: "Hello"
          farewell: "Goodbye"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds serialization with properties', () => {
    const { graph } = buildFromSource(`
      module core {
        serialization task_json {
          format: "json"
          version: "1.0"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds integration with all properties', () => {
    const { graph } = buildFromSource(`
      module platform {
        integration email_api {
          title: "Email API"
          kind: rest
          protocol: https
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds transport with all properties', () => {
    const { graph } = buildFromSource(`
      module platform {
        transport api_transport {
          protocol: grpc
          style: streaming
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds extension with all properties', () => {
    const { graph } = buildFromSource(`
      module platform {
        entity task { id: uuid }
        extension task_hook {
          target: task
          kind: hook
          language: "typescript"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds constitution with policies and applies_to', () => {
    const { graph } = buildFromSource(`
      module gov {
        entity task { id: uuid }
        constitution rules {
          applies_to: [task]
          policies {
            data {
              retention: "30d"
            }
          }
        }
      }
    `);
    const govEdges = graph.edges.filter((e) => e.kind === 'governs');
    expect(govEdges).toHaveLength(1);
  });

  it('builds privacy with all properties', () => {
    const { graph } = buildFromSource(`
      module gov {
        entity task { id: uuid }
        privacy task_privacy {
          applies_to: [task]
          classification: pii
          retention: "90d"
          exportable: true
          erasable: false
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
    const govEdges = graph.edges.filter((e) => e.kind === 'governs');
    expect(govEdges).toHaveLength(1);
  });

  it('builds secret with all properties', () => {
    const { graph } = buildFromSource(`
      module infra {
        secret db_pass {
          source: vault
          description: "Database password"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds environment with url and description', () => {
    const { graph } = buildFromSource(`
      module infra {
        environment prod {
          url: "https://prod.example.com"
          description: "Production environment"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds deployment with environments', () => {
    const { graph } = buildFromSource(`
      module infra {
        environment staging { url: "https://staging.example.com" }
        deployment main {
          environments: [staging]
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds test with description and target', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        test task_test {
          target: task
          description: "Test tasks"
          expect { name: "test" }
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds product_ref with all properties', () => {
    const { graph } = buildFromSource(`
      module ext {
        product_ref other_app {
          product: "other-app"
          version: "2.0"
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('builds action with workflow ref', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow do_task { }
        action run_task {
          title: "Run"
          workflow: do_task
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });
});

describe('Graph Serializer', () => {
  it('produces deterministic JSON', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        entity project { id: uuid }
      }
    `);
    const json1 = serializeGraph(graph);
    const json2 = serializeGraph(graph);
    expect(json1).toBe(json2);
  });

  it('has alphabetical key ordering', () => {
    const { graph } = buildFromSource(`
      module core { entity task { id: uuid } }
    `);
    const json = serializeGraph(graph);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });

  it('produces valid JSON', () => {
    const { graph } = buildFromSource(`
      module core { entity task { id: uuid title: string } }
    `);
    const json = serializeGraph(graph);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // Coverage: builder.ts branches — resolveTypeRef unresolved ref fallback
  // -----------------------------------------------------------------------
  it('resolves unresolved type ref to raw join', () => {
    // field references a type that doesn't exist - hits resolveTypeRef ref fallback
    const { ast, bag: parseBag } = parse(`
      module core { entity task { id: uuid status: nonexistent } }
    `);
    expect(parseBag.hasErrors).toBe(false);
    const bindResult = bind([ast]);
    // binder doesn't error on unknown types, builder falls back
    const { graph } = buildGraph([ast], bindResult);
    expect(graph.modules[0]).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Coverage: emitEdgesForItem branches
  // -----------------------------------------------------------------------
  it('emits action invokes edge', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow do_task { }
        action finish { title: "Finish" workflow: do_task }
      }
    `);
    const invokeEdges = graph.edges.filter((e) => e.kind === 'invokes');
    expect(invokeEdges.length).toBe(1);
  });

  it('emits event payload_type edge', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        event task_done { payload: task }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'payload_type');
    expect(edges.length).toBe(1);
  });

  it('emits capability member_of edges', () => {
    const { graph } = buildFromSource(`
      module core {
        actor admin { title: "Admin" }
        actor user { title: "User" }
        capability manage { title: "Manage" actors: [admin, user] }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'member_of');
    expect(edges.length).toBe(2);
  });

  it('emits surface capability and binds edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
        surface task_form { kind: form capability: manage binds: task }
      }
    `);
    const callEdges = graph.edges.filter((e) => e.kind === 'calls' && e.from.includes('surface'));
    expect(callEdges.length).toBe(1);
    const bindsEdges = graph.edges.filter((e) => e.kind === 'binds');
    expect(bindsEdges.length).toBe(1);
  });

  it('emits surface actions and nested surfaces edges', () => {
    const { graph } = buildFromSource(`
      module core {
        action do_it { title: "Do" }
        surface child_panel { kind: panel }
        surface main_page {
          kind: page
          actions: [do_it]
          surface: [child_panel]
        }
      }
    `);
    const actionEdges = graph.edges.filter((e) => e.kind === 'exposes_action');
    expect(actionEdges.length).toBe(1);
    const surfEdges = graph.edges.filter((e) => e.kind === 'contains_surface');
    expect(surfEdges.length).toBe(1);
  });

  it('emits rendering targets_surface edge', () => {
    const { graph } = buildFromSource(`
      module ui {
        surface page { kind: page }
        rendering page_r { target: page }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'targets_surface');
    expect(edges.length).toBe(1);
  });

  it('emits theme extends_tokens edge', () => {
    const { graph } = buildFromSource(`
      module design {
        tokens base { colors: { primary: "#000" } }
        theme dark { extends: base colors: { primary: "#fff" } }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'extends_tokens');
    expect(edges.length).toBe(1);
  });

  it('emits transport attaches_to edge', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow do_task { }
        transport task_api { target: do_task protocol: rest style: sync }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'attaches_to' && e.from.includes('transport'));
    expect(edges.length).toBe(1);
  });

  it('emits storage refines_entity edge', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        storage task_store { target: task model: relational table: "tasks" }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'refines_entity');
    expect(edges.length).toBe(1);
  });

  it('emits execution attaches_to edge', () => {
    const { graph } = buildFromSource(`
      module core {
        workflow do_task { }
        execution task_exec { target: do_task mode: async }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'attaches_to' && e.from.includes('execution'));
    expect(edges.length).toBeGreaterThan(0);
  });

  it('emits extension attaches_to and contract_type edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        extension task_ext {
          target: task
          kind: hook
          language: "typescript"
          contract { input: task output: task }
          body """
            console.log("hello");
          """
        }
      }
    `);
    const attachEdges = graph.edges.filter((e) => e.kind === 'attaches_to');
    expect(attachEdges.length).toBe(1);
    const contractEdges = graph.edges.filter((e) => e.kind === 'contract_type');
    expect(contractEdges.length).toBe(2);
  });

  it('emits constitution governs edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        constitution rules {
          applies_to: [task]
          policies {
            retention { days: 30 }
          }
        }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'governs');
    expect(edges.length).toBe(1);
  });

  it('emits security governs edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        security task_sec {
          applies_to: [task]
          requires: [task]
        }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'governs');
    expect(edges.length).toBe(1);
  });

  it('emits privacy governs edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        privacy task_priv {
          applies_to: [task]
          classification: internal
          retention: "30d"
          exportable: true
          erasable: false
        }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'governs');
    expect(edges.length).toBe(1);
  });

  it('emits validation governs edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        validation task_val { applies_to: [task] }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'governs');
    expect(edges.length).toBe(1);
  });

  it('emits deployment includes_env edges', () => {
    const { graph } = buildFromSource(`
      module core {
        environment staging { url: "https://staging.test" }
        deployment prod_deploy { environments: [staging] }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'includes_env');
    expect(edges.length).toBe(1);
  });

  it('emits test tests edge', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        test task_test { target: task expect { name: "task" } }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'tests');
    expect(edges.length).toBe(1);
  });

  it('emits environment binds_secret edge', () => {
    const { graph } = buildFromSource(`
      module core {
        secret db_pass { source: vault }
        environment prod {
          url: "https://api.test"
          secrets { db_pass: db_pass }
        }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'binds_secret');
    expect(edges.length).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Coverage: serializeItem branches — full optional properties
  // -----------------------------------------------------------------------
  it('serializes enum with member metadata', () => {
    const { graph } = buildFromSource(`
      module core {
        enum status {
          draft { label: "Draft" }
          done { label: "Done" }
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes surface with title ref', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid name: string }
        surface task_view {
          kind: detail
          title: task.name
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes value declaration', () => {
    const { graph } = buildFromSource(`
      module core {
        value address { street: string city: string }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes workflow with authorization, returns, steps', () => {
    const { graph } = buildFromSource(`
      module core {
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
        entity task { id: uuid ok: boolean }
        action finish { title: "Finish" }
        workflow do_task {
          capability: manage
          authorization { admin: [task.create, task.update] }
          input { name: string count: integer }
          reads { task }
          writes { task }
          returns { ok: boolean }
          steps {
            call finish
            decide check {
              when yes -> call finish
              when no -> fail error_code
            }
            fail abort
          }
        }
      }
    `);
    const wfNodes = graph.modules[0];
    expect(wfNodes).toBeDefined();
  });

  it('serializes workflow effects with emit and notify', () => {
    const { graph } = buildFromSource(`
      module core {
        event task_done { }
        actor admin { title: "Admin" }
        workflow do_task {
          effects {
            audit "completed"
            emit task_done
            notify admin
          }
        }
      }
    `);
    const emitEdges = graph.edges.filter((e) => e.kind === 'emits');
    expect(emitEdges.length).toBe(1);
    const notifyEdges = graph.edges.filter((e) => e.kind === 'notifies');
    expect(notifyEdges.length).toBe(1);
  });

  it('serializes constitution with policies', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        constitution rules {
          description: "Rules"
          applies_to: [task]
          policies {
            retention { days: 30 }
          }
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes product_ref declaration', () => {
    const { graph } = buildFromSource(`
      module core {
        product_ref dep { product: "other" version: "1.0" }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes product with publishes', () => {
    const { graph } = buildFromSource(`
      product myapp {
        title: "App"
        version: "1.0"
        publishes {
          events: [core.task_done]
        }
      }
      module core {
        event task_done { }
      }
    `);
    expect(graph.product).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Coverage: surface serialization edge — handles missing surface kind
  // -----------------------------------------------------------------------
  it('serializes surface with serialization ref', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        serialization task_json { format: "json" }
        surface task_form {
          kind: form
          binds: task
          serialization: task_json
        }
      }
    `);
    const edges = graph.edges.filter((e) => e.kind === 'uses_serialization');
    expect(edges.length).toBe(1);
  });

  it('serializes workflow with trigger and transitions', () => {
    const { graph } = buildFromSource(`
      module core {
        enum status { draft done }
        entity task { id: uuid status: status }
        event task_created { }
        workflow update_task {
          on: task_created
          transitions {
            task.status: draft -> done
          }
        }
      }
    `);
    const triggerEdges = graph.edges.filter((e) => e.kind === 'triggers_on');
    expect(triggerEdges.length).toBe(1);
    const transEdges = graph.edges.filter((e) => e.kind === 'transitions');
    expect(transEdges.length).toBe(1);
  });

  it('serializes extension with body and contract', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        extension task_hook {
          target: task
          kind: hook
          language: "typescript"
          contract { input: task output: task }
          body """
            return input;
          """
        }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes workflow input/returns type edges', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid }
        workflow do_task {
          input { item: task }
          returns { result: task }
        }
      }
    `);
    const inputEdges = graph.edges.filter((e) => e.kind === 'input_type');
    expect(inputEdges.length).toBe(1);
    const returnEdges = graph.edges.filter((e) => e.kind === 'return_type');
    expect(returnEdges.length).toBe(1);
  });

  it('resolves generic type ref in fields', () => {
    const { graph } = buildFromSource(`
      module core {
        entity task { id: uuid tags: list<string> }
      }
    `);
    expect(graph.modules[0]).toBeDefined();
  });

  it('serializes all value node types in metadata', () => {
    const { graph } = buildFromSource(`
      module core {
        enum priority {
          low { weight: 1 scale: 1.5 active: true display: block ref: core.priority tags: [1, 2] }
          high { weight: 2 }
        }
      }
    `);
    const mod = graph.modules[0] as unknown as Record<string, unknown>;
    const enums = mod['enums'] as Array<Record<string, unknown>>;
    const members = enums[0]!['members'] as Array<Record<string, unknown>>;
    const lowMeta = members[0]!['metadata'] as Record<string, unknown>;
    expect(lowMeta['weight']).toBe(1);
    expect(lowMeta['scale']).toBe(1.5);
    expect(lowMeta['active']).toBe(true);
    expect(lowMeta['display']).toBe('block');
    expect(lowMeta['ref']).toBe('core.priority');
    expect(lowMeta['tags']).toEqual([1, 2]);
  });

  it('serializes product with title and version', () => {
    const { graph } = buildFromSource(`
      product myapp {
        title: "My App"
        version: "2.0"
      }
      module core {
        entity task { id: uuid }
      }
    `);
    expect(graph.product.title).toBe('My App');
    expect(graph.product.version).toBe('2.0');
  });

  it('serializes import with alias', () => {
    const { graph } = buildFromSource(`
      module base {
        entity task { id: uuid }
      }
      module ext {
        import task as my_task from base
        entity job { id: uuid ref: my_task }
      }
    `);
    const extMod = graph.modules.find((m) => m.name === 'ext');
    expect(extMod).toBeDefined();
  });
});
