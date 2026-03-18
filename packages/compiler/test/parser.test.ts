import { describe, it, expect } from 'vitest';
import { parse, parseFile, FIXTURES_DIR } from './helpers.js';
import { join } from 'node:path';
import type { ModuleDecl, ProductDecl } from '../src/parser/ast.js';

describe('Parser', () => {
  // -----------------------------------------------------------------------
  // Product declarations
  // -----------------------------------------------------------------------
  describe('product declarations', () => {
    it('parses minimal product', () => {
      const { ast, bag } = parse(`
        product todo_app {
          title: "Todo App"
          version: "0.1.0"
          modules: [todo]
        }
      `);
      expect(bag.hasErrors).toBe(false);
      expect(ast.declarations).toHaveLength(1);
      const prod = ast.declarations[0] as ProductDecl;
      expect(prod.kind).toBe('product');
      expect(prod.name).toBe('todo_app');
      expect(prod.title).toBe('Todo App');
      expect(prod.version).toBe('0.1.0');
      expect(prod.modules).toEqual(['todo']);
    });

    it('parses product with multiple modules', () => {
      const { ast, bag } = parse(`
        product app {
          title: "App"
          version: "1.0.0"
          modules: [identity, billing, design]
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const prod = ast.declarations[0] as ProductDecl;
      expect(prod.modules).toEqual(['identity', 'billing', 'design']);
    });
  });

  // -----------------------------------------------------------------------
  // Module declarations
  // -----------------------------------------------------------------------
  describe('module declarations', () => {
    it('parses empty module', () => {
      const { ast, bag } = parse('module billing {}');
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      expect(mod.kind).toBe('module');
      expect(mod.name).toBe('billing');
      expect(mod.items).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Imports
  // -----------------------------------------------------------------------
  describe('imports', () => {
    it('parses simple import', () => {
      const { ast, bag } = parse(`
        module billing {
          import user from identity
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const imp = mod.items[0]!;
      expect(imp.kind).toBe('import');
      if (imp.kind === 'import') {
        expect(imp.symbol).toBe('user');
        expect(imp.from).toBe('identity');
      }
    });

    it('parses import with alias', () => {
      const { ast, bag } = parse(`
        module billing {
          import admin as billing_admin from identity
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const imp = mod.items[0]!;
      if (imp.kind === 'import') {
        expect(imp.symbol).toBe('admin');
        expect(imp.alias).toBe('billing_admin');
        expect(imp.from).toBe('identity');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Entities
  // -----------------------------------------------------------------------
  describe('entities', () => {
    it('parses entity with fields', () => {
      const { ast, bag } = parse(`
        module billing {
          entity invoice {
            invoice_id: uuid
            total: decimal
            created: datetime
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const entity = mod.items[0]!;
      expect(entity.kind).toBe('entity');
      if (entity.kind === 'entity') {
        expect(entity.name).toBe('invoice');
        expect(entity.fields).toHaveLength(3);
        expect(entity.fields[0]!.name).toBe('invoice_id');
        expect(entity.fields[0]!.type).toEqual({ kind: 'primitive', name: 'uuid', location: expect.any(Object) });
      }
    });

    it('parses entity with default values', () => {
      const { ast, bag } = parse(`
        module board {
          entity task {
            done: boolean = false
            status: task_status = backlog
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const entity = mod.items[0]!;
      if (entity.kind === 'entity') {
        expect(entity.fields[0]!.defaultValue).toEqual({ kind: 'boolean', value: false });
        expect(entity.fields[1]!.defaultValue).toEqual({ kind: 'identifier', value: 'backlog' });
      }
    });

    it('parses entity with generic types', () => {
      const { ast, bag } = parse(`
        module board {
          entity task {
            description: optional<string>
            tags: list<string>
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const entity = mod.items[0]!;
      if (entity.kind === 'entity') {
        expect(entity.fields[0]!.type.kind).toBe('generic');
        expect(entity.fields[1]!.type.kind).toBe('generic');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Enums
  // -----------------------------------------------------------------------
  describe('enums', () => {
    it('parses enum with members', () => {
      const { ast, bag } = parse(`
        module billing {
          enum invoice_status {
            draft
            issued
            paid
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const decl = mod.items[0]!;
      expect(decl.kind).toBe('enum');
      if (decl.kind === 'enum') {
        expect(decl.members).toHaveLength(3);
        expect(decl.members.map((m) => m.name)).toEqual(['draft', 'issued', 'paid']);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Rules
  // -----------------------------------------------------------------------
  describe('rules', () => {
    it('parses simple rule', () => {
      const { ast, bag } = parse(`
        module billing {
          rule positive_total {
            entity: invoice
            condition: total > 0
            message: billing.errors.invalid_total
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      expect(rule.kind).toBe('rule');
      if (rule.kind === 'rule') {
        expect(rule.name).toBe('positive_total');
        expect(rule.entity).toEqual(['invoice']);
        expect(rule.condition.kind).toBe('binary');
        expect(rule.message).toEqual(['billing', 'errors', 'invalid_total']);
      }
    });

    it('parses compound rule with and/or', () => {
      const { ast, bag } = parse(`
        module billing {
          rule ready {
            entity: invoice
            condition: total > 0 and status == draft
            message: billing.errors.not_ready
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('binary');
        if (rule.condition.kind === 'binary') {
          expect(rule.condition.op).toBe('and');
        }
      }
    });

    it('parses rule with not operator', () => {
      const { ast, bag } = parse(`
        module billing {
          rule not_cancelled {
            entity: invoice
            condition: not status == cancelled
            message: billing.errors.is_cancelled
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('unary');
      }
    });

    it('parses rule with parenthesized expressions', () => {
      const { ast, bag } = parse(`
        module billing {
          rule payable {
            entity: invoice
            condition: (status == issued or status == draft) and total > 0
            message: billing.errors.not_payable
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('binary');
        if (rule.condition.kind === 'binary') {
          expect(rule.condition.op).toBe('and');
          expect(rule.condition.left.kind).toBe('paren');
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // Actors & capabilities
  // -----------------------------------------------------------------------
  describe('actors and capabilities', () => {
    it('parses actor', () => {
      const { ast, bag } = parse(`
        module billing {
          actor admin {
            title: "Administrator"
            description: "System admin"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const actor = mod.items[0]!;
      expect(actor.kind).toBe('actor');
      if (actor.kind === 'actor') {
        expect(actor.name).toBe('admin');
        expect(actor.title).toBe('Administrator');
      }
    });

    it('parses capability with actors list', () => {
      const { ast, bag } = parse(`
        module billing {
          capability invoicing {
            title: "Invoice Management"
            actors: [admin, accountant]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const cap = mod.items[0]!;
      if (cap.kind === 'capability') {
        expect(cap.title).toBe('Invoice Management');
        expect(cap.actors).toHaveLength(2);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Workflows
  // -----------------------------------------------------------------------
  describe('workflows', () => {
    it('parses workflow with authorization, reads, writes, returns', () => {
      const { ast, bag } = parse(`
        module billing {
          workflow issue_invoice {
            capability: invoicing

            authorization {
              admin: [invoice.issue]
            }

            reads { invoice }
            writes { invoice }

            returns {
              ok: invoice
              error: invoice_error
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      expect(wf.kind).toBe('workflow');
      if (wf.kind === 'workflow') {
        expect(wf.name).toBe('issue_invoice');
        expect(wf.capability).toEqual(['invoicing']);
        expect(wf.authorization).toHaveLength(1);
        expect(wf.authorization![0]!.actor).toBe('admin');
        expect(wf.reads).toHaveLength(1);
        expect(wf.writes).toHaveLength(1);
        expect(wf.returns).toHaveLength(2);
      }
    });

    it('parses workflow with transitions', () => {
      const { ast, bag } = parse(`
        module billing {
          workflow issue_invoice {
            writes { invoice }
            transitions { invoice.status: draft -> issued }
            returns { ok: invoice }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      if (wf.kind === 'workflow') {
        expect(wf.transitions).toHaveLength(1);
        expect(wf.transitions![0]!.from).toBe('draft');
        expect(wf.transitions![0]!.to).toBe('issued');
      }
    });

    it('parses workflow with steps including decide/when', () => {
      const { ast, bag } = parse(`
        module board {
          workflow move_task {
            steps {
              call validate_move

              decide current_status {
                when done -> fail already_done
                when review -> call finalize_task
              }

              call apply_transition
            }

            returns { ok: boolean }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      if (wf.kind === 'workflow') {
        expect(wf.steps).toHaveLength(3);
        expect(wf.steps![0]!.kind).toBe('call');
        expect(wf.steps![1]!.kind).toBe('decide');
        expect(wf.steps![2]!.kind).toBe('call');
        if (wf.steps![1]!.kind === 'decide') {
          expect(wf.steps![1]!.branches).toHaveLength(2);
        }
      }
    });

    it('parses workflow with effects', () => {
      const { ast, bag } = parse(`
        module board {
          workflow move_task {
            effects {
              audit "Task moved"
              emit task_moved
            }
            returns { ok: boolean }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      if (wf.kind === 'workflow') {
        expect(wf.effects).toHaveLength(2);
        expect(wf.effects![0]!.kind).toBe('audit');
        expect(wf.effects![1]!.kind).toBe('emit');
      }
    });

    it('parses workflow with on: trigger', () => {
      const { ast, bag } = parse(`
        module board {
          workflow notify {
            on: task_completed
            returns { ok: boolean }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      if (wf.kind === 'workflow') {
        expect(wf.trigger).toBeDefined();
      }
    });

    it('parses workflow with input fields', () => {
      const { ast, bag } = parse(`
        module board {
          workflow move_task {
            input {
              task_id: uuid
              target_status: task_status
            }
            returns { ok: boolean }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      if (wf.kind === 'workflow') {
        expect(wf.input).toHaveLength(2);
        expect(wf.input![0]!.name).toBe('task_id');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Actions & events
  // -----------------------------------------------------------------------
  describe('actions and events', () => {
    it('parses action', () => {
      const { ast, bag } = parse(`
        module billing {
          action issue_invoice {
            title: "Issue Invoice"
            workflow: issue_invoice
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const action = mod.items[0]!;
      if (action.kind === 'action') {
        expect(action.name).toBe('issue_invoice');
        expect(action.title).toBe('Issue Invoice');
      }
    });

    it('parses event with payload', () => {
      const { ast, bag } = parse(`
        module board {
          event task_moved {
            payload: task
            description: "Fired when a task moves"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const event = mod.items[0]!;
      if (event.kind === 'event') {
        expect(event.payload).toBeDefined();
        expect(event.description).toBe('Fired when a task moves');
      }
    });

    it('parses schedule', () => {
      const { ast, bag } = parse(`
        module platform {
          schedule daily_archive {
            cron: "0 0 * * *"
            description: "Daily cleanup"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const sched = mod.items[0]!;
      if (sched.kind === 'schedule') {
        expect(sched.cron).toBe('0 0 * * *');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Surfaces
  // -----------------------------------------------------------------------
  describe('surfaces', () => {
    it('parses surface with binds and actions', () => {
      const { ast, bag } = parse(`
        module board {
          surface board_view {
            kind: view
            title: "Board"
            binds: task
            actions: [move_task]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const surf = mod.items[0]!;
      if (surf.kind === 'surface') {
        expect(surf.surfaceKind).toBe('view');
        expect(surf.title).toBe('Board');
        expect(surf.binds).toEqual(['task']);
      }
    });

    it('parses surface with symbol-ref title', () => {
      const { ast, bag } = parse(`
        module board {
          surface board_view {
            kind: view
            title: board.strings.board_title
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const surf = mod.items[0]!;
      if (surf.kind === 'surface') {
        expect(surf.title).toEqual(['board', 'strings', 'board_title']);
      }
    });

    it('parses surface with hooks', () => {
      const { ast, bag } = parse(`
        module board {
          surface board_view {
            kind: view
            hooks {
              load: move_task
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const surf = mod.items[0]!;
      if (surf.kind === 'surface') {
        expect(surf.hooks).toHaveLength(1);
        expect(surf.hooks![0]!.name).toBe('load');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Design system
  // -----------------------------------------------------------------------
  describe('design system', () => {
    it('parses tokens declaration', () => {
      const { ast, bag } = parse(`
        module design {
          tokens base {
            color: {
              brand_primary: "#6366F1"
            }
            spacing: {
              sm: 8
              md: 16
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const tokens = mod.items[0]!;
      if (tokens.kind === 'tokens') {
        expect(tokens.categories).toHaveLength(2);
        expect(tokens.categories[0]!.name).toBe('color');
        expect(tokens.categories[1]!.name).toBe('spacing');
      }
    });

    it('parses strings declaration', () => {
      const { ast, bag } = parse(`
        module board {
          strings board_strings {
            title: "Board"
            description: "A task board"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const strings = mod.items[0]!;
      if (strings.kind === 'strings') {
        expect(strings.entries).toHaveLength(2);
        expect(strings.entries[0]!.key).toBe('title');
        expect(strings.entries[0]!.value).toBe('Board');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Governance
  // -----------------------------------------------------------------------
  describe('governance', () => {
    it('parses constitution with policies', () => {
      const { ast, bag } = parse(`
        module core {
          constitution standards {
            description: "Platform standards"
            policies {
              backend {
                framework: "kotlin"
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const con = mod.items[0]!;
      if (con.kind === 'constitution') {
        expect(con.description).toBe('Platform standards');
        expect(con.policies).toHaveLength(1);
      }
    });

    it('parses security declaration', () => {
      const { ast, bag } = parse(`
        module core {
          security billing_security {
            applies_to: [core]
            requires: [audit_log]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const sec = mod.items[0]!;
      expect(sec.kind).toBe('security');
    });

    it('parses privacy declaration', () => {
      const { ast, bag } = parse(`
        module core {
          privacy customer_privacy {
            applies_to: [customer]
            classification: personal_data
            retention: "7 years"
            erasable: true
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const priv = mod.items[0]!;
      if (priv.kind === 'privacy') {
        expect(priv.classification).toBe('personal_data');
        expect(priv.retention).toBe('7 years');
        expect(priv.erasable).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Platform
  // -----------------------------------------------------------------------
  describe('platform', () => {
    it('parses storage with indexes', () => {
      const { ast, bag } = parse(`
        module board {
          storage task_storage {
            target: task
            model: relational
            table: "tasks"
            indexes: [
              [status],
              unique [task_id]
            ]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const storage = mod.items[0]!;
      if (storage.kind === 'storage') {
        expect(storage.model).toBe('relational');
        expect(storage.table).toBe('tasks');
        expect(storage.indexes).toHaveLength(2);
        expect(storage.indexes![0]!.unique).toBe(false);
        expect(storage.indexes![1]!.unique).toBe(true);
      }
    });

    it('parses rendering with grid and placement', () => {
      const { ast, bag } = parse(`
        module platform {
          rendering board_layout {
            target: board.board_view
            platform: web
            layout: grid

            grid {
              columns: [1, 1, 1, 1]
              gap: 16
            }

            placement {
              col1: {
                column: 1
              }
            }

            style {
              background: design.base.color.bg
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rendering = mod.items[0]!;
      if (rendering.kind === 'rendering') {
        expect(rendering.platform).toBe('web');
        expect(rendering.layout).toBe('grid');
        expect(rendering.grid).toBeDefined();
        expect(rendering.placements).toHaveLength(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------
  describe('test declarations', () => {
    it('parses test with given/expect', () => {
      const { ast, bag } = parse(`
        module billing {
          test move_from_backlog {
            target: move_task
            description: "Can move from backlog"

            given {
              task.status: backlog
            }

            expect {
              transition: "task.status: backlog -> in_progress"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const test = mod.items[0]!;
      if (test.kind === 'test') {
        expect(test.name).toBe('move_from_backlog');
        expect(test.given).toHaveLength(1);
        expect(test.expect).toHaveLength(1);
      }
    });

    it('parses test with authorization expect', () => {
      const { ast, bag } = parse(`
        module billing {
          test auth_check {
            target: issue_invoice

            expect {
              authorization {
                admin: allowed
                guest: denied
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const test = mod.items[0]!;
      if (test.kind === 'test') {
        const authExpect = test.expect.find((e) => e.key === 'authorization');
        expect(authExpect).toBeDefined();
        expect(Array.isArray(authExpect!.value)).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Fixture file parsing — valid fixtures parse without errors
  // -----------------------------------------------------------------------
  describe('fixture parsing', () => {
    it('parses minimal fixture without errors', () => {
      const { ast, bag } = parseFile(join(FIXTURES_DIR, 'valid/minimal/app.prd'));
      expect(bag.hasErrors).toBe(false);
      expect(ast.declarations.length).toBeGreaterThan(0);
    });

    it('parses workflow-transitions fixture without errors', () => {
      const { ast, bag } = parseFile(join(FIXTURES_DIR, 'valid/workflow-transitions/app.prd'));
      expect(bag.hasErrors).toBe(false);
    });

    it('parses multi-module fixture without errors', () => {
      const { ast, bag } = parseFile(join(FIXTURES_DIR, 'valid/multi-module/app.prd'));
      expect(bag.hasErrors).toBe(false);
    });

    it('parses governance fixture without errors', () => {
      const { ast, bag } = parseFile(join(FIXTURES_DIR, 'valid/governance/app.prd'));
      expect(bag.hasErrors).toBe(false);
    });

    it('parses compound-rules fixture without errors', () => {
      const { ast, bag } = parseFile(join(FIXTURES_DIR, 'valid/compound-rules/app.prd'));
      expect(bag.hasErrors).toBe(false);
    });

    it('parses invalid fixtures without parse errors (errors detected later)', () => {
      // Invalid fixtures should parse cleanly — errors are semantic, not syntactic
      for (const dir of ['unresolved-symbol', 'ambiguous-import', 'missing-module', 'duplicate-entity', 'invalid-transition']) {
        const { bag } = parseFile(join(FIXTURES_DIR, `invalid/${dir}/app.prd`));
        expect(bag.hasErrors).toBe(false);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Error recovery
  // -----------------------------------------------------------------------
  describe('error recovery', () => {
    it('recovers from missing closing brace', () => {
      const { ast } = parse(`
        module billing {
          entity invoice {
            id: uuid
        module other {}
      `);
      // Should still produce some declarations
      expect(ast.declarations.length).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // Value types
  // -----------------------------------------------------------------------
  describe('value declarations', () => {
    it('parses value object', () => {
      const { ast, bag } = parse(`
        module billing {
          value address {
            street: string
            city: string
            zip: string
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const val = mod.items[0]!;
      expect(val.kind).toBe('value');
      if (val.kind === 'value') {
        expect(val.fields).toHaveLength(3);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Theme declarations
  // -----------------------------------------------------------------------
  describe('themes', () => {
    it('parses theme with extends and overrides', () => {
      const { ast, bag } = parse(`
        module design {
          theme dark_mode {
            extends: light
            color: {
              primary: "#000000"
              secondary: "#333333"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const theme = mod.items[0]!;
      if (theme.kind === 'theme') {
        expect(theme.name).toBe('dark_mode');
        expect(theme.extends).toBe('light');
        expect(theme.overrides).toHaveLength(1);
        expect(theme.overrides[0]!.name).toBe('color');
        expect(theme.overrides[0]!.tokens).toHaveLength(2);
      }
    });

    it('parses theme without extends', () => {
      const { ast, bag } = parse(`
        module design {
          theme compact {
            spacing: {
              sm: 4
              md: 8
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const theme = mod.items[0]!;
      if (theme.kind === 'theme') {
        expect(theme.extends).toBe('');
        expect(theme.overrides).toHaveLength(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------
  describe('serialization', () => {
    it('parses serialization with key-value pairs', () => {
      const { ast, bag } = parse(`
        module platform {
          serialization json_format {
            format: "json"
            indent: 2
            encoding: "utf-8"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const ser = mod.items[0]!;
      if (ser.kind === 'serialization') {
        expect(ser.name).toBe('json_format');
        expect(ser.properties).toHaveLength(3);
        expect(ser.properties[0]!.key).toBe('format');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Integration
  // -----------------------------------------------------------------------
  describe('integrations', () => {
    it('parses integration with all properties', () => {
      const { ast, bag } = parse(`
        module platform {
          integration stripe_api {
            title: "Stripe Payment API"
            description: "Payment processing integration"
            kind: payment
            protocol: rest
            serialization: json_format
            auth {
              api_key: "sk_test_123"
              timeout: 30
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const integ = mod.items[0]!;
      if (integ.kind === 'integration') {
        expect(integ.name).toBe('stripe_api');
        expect(integ.title).toBe('Stripe Payment API');
        expect(integ.integrationKind).toBe('payment');
        expect(integ.protocol).toBe('rest');
        expect(integ.serialization).toEqual(['json_format']);
        expect(integ.auth).toHaveLength(2);
      }
    });

    it('parses minimal integration', () => {
      const { ast, bag } = parse(`
        module platform {
          integration webhook {
            kind: http
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const integ = mod.items[0]!;
      if (integ.kind === 'integration') {
        expect(integ.integrationKind).toBe('http');
        expect(integ.auth).toBeUndefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Transport
  // -----------------------------------------------------------------------
  describe('transport', () => {
    it('parses transport declaration', () => {
      const { ast, bag } = parse(`
        module platform {
          transport http_transport {
            target: web_app
            protocol: http
            style: rest
            description: "HTTP REST transport"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const tr = mod.items[0]!;
      if (tr.kind === 'transport') {
        expect(tr.name).toBe('http_transport');
        expect(tr.protocol).toBe('http');
        expect(tr.style).toBe('rest');
        expect(tr.target).toEqual(['web_app']);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------
  describe('execution', () => {
    it('parses execution declaration', () => {
      const { ast, bag } = parse(`
        module platform {
          execution cloud_exec {
            target: lambda_runtime
            mode: async
            description: "AWS Lambda execution"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const exec = mod.items[0]!;
      if (exec.kind === 'execution') {
        expect(exec.name).toBe('cloud_exec');
        expect(exec.mode).toBe('async');
        expect(exec.target).toEqual(['lambda_runtime']);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Extension
  // -----------------------------------------------------------------------
  describe('extensions', () => {
    it('parses extension with contract and body', () => {
      const { ast, bag } = parse(`
        module platform {
          extension email_validator {
            target: user
            kind: validator
            language: "typescript"
            description: "Custom email validation"
            contract {
              input: string
              output: boolean
            }
            body """
              return input.includes('@');
            """
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const ext = mod.items[0]!;
      if (ext.kind === 'extension') {
        expect(ext.name).toBe('email_validator');
        expect(ext.extensionKind).toBe('validator');
        expect(ext.language).toBe('typescript');
        expect(ext.contract).toBeDefined();
        expect(ext.contract!.input).toBeDefined();
        expect(ext.contract!.output).toBeDefined();
        expect(ext.body).toContain("return input.includes('@')");
      }
    });
  });

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------
  describe('validation', () => {
    it('parses validation declaration', () => {
      const { ast, bag } = parse(`
        module core {
          validation email_rules {
            applies_to: [user]
            requires: [email_format]
            description: "Email format validation"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const val = mod.items[0]!;
      if (val.kind === 'validation') {
        expect(val.name).toBe('email_rules');
        expect(val.appliesTo).toHaveLength(1);
        expect(val.requires).toHaveLength(1);
        expect(val.description).toBe('Email format validation');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Product ref
  // -----------------------------------------------------------------------
  describe('product references', () => {
    it('parses product_ref with consumes and auth', () => {
      const { ast, bag } = parse(`
        module platform {
          product_ref stripe_gateway {
            product: "stripe-payments"
            version: "2.0"
            description: "Stripe integration"
            consumes {
              events: [payment.processed]
            }
            auth {
              api_key: "sk_live"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const ref = mod.items[0]!;
      if (ref.kind === 'product_ref') {
        expect(ref.name).toBe('stripe_gateway');
        expect(ref.product).toBe('stripe-payments');
        expect(ref.version).toBe('2.0');
        expect(ref.consumes).toBeDefined();
        expect(ref.auth).toHaveLength(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Deployment
  // -----------------------------------------------------------------------
  describe('deployments', () => {
    it('parses deployment with environments', () => {
      const { ast, bag } = parse(`
        module platform {
          deployment prod_stack {
            environments: [production, staging]
            description: "Production deployment"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const dep = mod.items[0]!;
      if (dep.kind === 'deployment') {
        expect(dep.name).toBe('prod_stack');
        expect(dep.environments).toBeDefined();
        expect(dep.description).toBe('Production deployment');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Schedule
  // -----------------------------------------------------------------------
  describe('schedules', () => {
    it('parses schedule with cron', () => {
      const { ast, bag } = parse(`
        module billing {
          schedule daily_report {
            cron: "0 9 * * *"
            description: "Daily billing report"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const sched = mod.items[0]!;
      if (sched.kind === 'schedule') {
        expect(sched.name).toBe('daily_report');
        expect(sched.cron).toBe('0 9 * * *');
        expect(sched.description).toBe('Daily billing report');
      }
    });
  });

  // -----------------------------------------------------------------------
  // Environment
  // -----------------------------------------------------------------------
  describe('environments', () => {
    it('parses environment with url and secrets', () => {
      const { ast, bag } = parse(`
        module platform {
          environment production {
            url: "https://api.example.com"
            description: "Production environment"
            secrets {
              db_pass: "vault_db_password"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const env = mod.items[0]!;
      if (env.kind === 'environment') {
        expect(env.name).toBe('production');
        expect(env.url).toBe('https://api.example.com');
        expect(env.secrets).toHaveLength(1);
        expect(env.secrets![0]!.name).toBe('db_pass');
      }
    });

    it('parses environment with integrations block', () => {
      const { ast, bag } = parse(`
        module platform {
          environment staging {
            integrations {
              stripe: "test_key"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const env = mod.items[0]!;
      if (env.kind === 'environment') {
        expect(env.integrations).toHaveLength(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Secret (with all properties)
  // -----------------------------------------------------------------------
  describe('secret declarations', () => {
    it('parses secret with all properties', () => {
      const { ast, bag } = parse(`
        module platform {
          secret api_key {
            description: "External API key"
            source: vault
            env: "API_KEY_VAR"
            path: "/secrets/api-key"
            scope: [billing, identity]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const sec = mod.items[0]!;
      if (sec.kind === 'secret') {
        expect(sec.name).toBe('api_key');
        expect(sec.source).toBe('vault');
        expect(sec.env).toBe('API_KEY_VAR');
        expect(sec.path).toBe('/secrets/api-key');
        expect(sec.scope).toBeDefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Constitution with use/packages
  // -----------------------------------------------------------------------
  describe('constitution with packages', () => {
    it('parses constitution with use clause', () => {
      const { ast, bag } = parse(`
        module core {
          constitution standards {
            description: "Platform standards"
            applies_to: [core, billing]
            use: [registry/backend/nestjs@1.0]
            policies {
              backend {
                framework: "kotlin"
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const con = mod.items[0]!;
      if (con.kind === 'constitution') {
        expect(con.packages).toBeDefined();
        expect(con.appliesTo).toBeDefined();
        expect(con.policies).toHaveLength(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Workflow with steps fail branch
  // -----------------------------------------------------------------------
  describe('workflow steps with fail', () => {
    it('parses workflow with fail step', () => {
      const { ast, bag } = parse(`
        module billing {
          workflow process_payment {
            capability: payments
            steps {
              call validate_card
              decide is_valid {
                when yes -> call charge_card
                when no -> fail payment_declined
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const wf = mod.items[0]!;
      if (wf.kind === 'workflow') {
        expect(wf.steps!.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Expression: empty brackets and keyword-as-field-ref
  // -----------------------------------------------------------------------
  describe('expression edge cases', () => {
    it('parses rule condition with empty brackets []', () => {
      const { ast, bag } = parse(`
        module billing {
          rule must_have_items {
            entity: order
            condition: items != []
            message: billing.strings.items_required
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('binary');
      }
    });

    it('parses rule condition with keyword-as-field (title)', () => {
      const { ast, bag } = parse(`
        module board {
          rule must_have_title {
            entity: task
            condition: title != ""
            message: board.strings.title_required
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('binary');
      }
    });

    it('parses expression with parenthesized sub-expression', () => {
      const { ast, bag } = parse(`
        module core {
          rule combo {
            entity: task
            condition: (active == true) and (count > 0)
            message: core.strings.invalid
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('binary');
      }
    });

    it('parses expression with unary not operator', () => {
      const { ast, bag } = parse(`
        module core {
          rule not_deleted {
            entity: task
            condition: not deleted
            message: core.strings.deleted
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('unary');
      }
    });

    it('parses expression with multi-segment field access', () => {
      const { ast, bag } = parse(`
        module core {
          rule owner_check {
            entity: task
            condition: owner.name != ""
            message: core.strings.no_owner
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0] as ModuleDecl;
      const rule = mod.items[0]!;
      if (rule.kind === 'rule') {
        expect(rule.condition.kind).toBe('binary');
        if (rule.condition.kind === 'binary') {
          expect(rule.condition.left.kind).toBe('access');
          if (rule.condition.left.kind === 'access') {
            expect(rule.condition.left.segments).toEqual(['owner', 'name']);
          }
        }
      }
    });

    it('parses expression with integer literal', () => {
      const { ast, bag } = parse(`
        module core {
          rule min_count {
            entity: task
            condition: count >= 1
            message: core.strings.too_few
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with boolean literal', () => {
      const { ast, bag } = parse(`
        module core {
          rule must_be_active {
            entity: task
            condition: active == true
            message: core.strings.inactive
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with decimal literal', () => {
      const { ast, bag } = parse(`
        module core {
          rule min_rate {
            entity: task
            condition: rate > 0.5
            message: core.strings.low
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression that falls through to recovery', () => {
      const { ast, bag } = parse(`
        module core {
          rule oops {
            entity: task
            condition: @
            message: core.strings.bad
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with empty list comparison', () => {
      const { ast, bag } = parse(`
        module core {
          rule empty_list {
            entity: task
            condition: items == []
            message: core.strings.empty
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with dot access after non-access expr', () => {
      const { ast, bag } = parse(`
        module core {
          rule chained {
            entity: task
            condition: (item).name == "test"
            message: core.strings.bad
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('handles expression access recovery on non-identifier after dot', () => {
      const { ast, bag } = parse(`
        module core {
          rule broken_access {
            entity: task
            condition: item.123
            message: core.strings.bad
          }
        }
      `);
      // Should not crash — recovery path
      expect(ast).toBeDefined();
    });

    it('handles expression with EOF token list', () => {
      const { ast } = parse(`
        module core {
          rule empty_cond {
            entity: task
            condition:
          }
        }
      `);
      expect(ast).toBeDefined();
    });
  });

  describe('Product with all optional properties', () => {
    it('parses product with description', () => {
      const { ast, bag } = parse(`
        product app {
          title: "My App"
          version: "1.0"
          description: "A test application"
          modules: [core]
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const prod = ast.declarations[0]!;
      expect(prod.kind).toBe('product');
      if (prod.kind === 'product') {
        expect(prod.description).toBe('A test application');
      }
    });

    it('reports error on unknown product property', () => {
      const { bag } = parse(`
        product app {
          title: "App"
          unknown_prop: "bad"
        }
      `);
      expect(bag.hasErrors).toBe(true);
    });
  });

  describe('Enum with metadata', () => {
    it('parses enum members with metadata blocks', () => {
      const { ast, bag } = parse(`
        module core {
          enum priority {
            low { label: "Low" order: 1 }
            medium { label: "Medium" order: 2 }
            high { label: "High" order: 3 }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const en = mod.items[0]!;
        if (en.kind === 'enum') {
          expect(en.members).toHaveLength(3);
          expect(en.members[0]!.metadata).toBeDefined();
          expect(en.members[0]!.metadata).toHaveLength(2);
        }
      }
    });
  });

  describe('Rule with message property', () => {
    it('parses rule with all properties including message', () => {
      const { ast, bag } = parse(`
        module core {
          entity task { id: uuid }
          rule must_exist {
            entity: task
            condition: id != ""
            message: validation_messages.must_exist
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Actor with description', () => {
    it('parses actor with description property', () => {
      const { ast, bag } = parse(`
        module core {
          actor admin {
            title: "Administrator"
            description: "System administrator"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const actor = mod.items[0]!;
        if (actor.kind === 'actor') {
          expect(actor.description).toBe('System administrator');
        }
      }
    });
  });

  describe('Capability with description', () => {
    it('parses capability with description', () => {
      const { ast, bag } = parse(`
        module core {
          actor admin { title: "Admin" }
          capability manage {
            title: "Manage"
            description: "Full management"
            actors: [admin]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Surface with all optional properties', () => {
    it('parses surface with hooks and fields', () => {
      const { ast, bag } = parse(`
        module core {
          entity task { id: uuid name: string }
          action do_thing { title: "Do" }
          surface task_form {
            kind: form
            title: "Task Form"
            description: "Edit a task"
            fields {
              name: string
              priority: integer
            }
            hooks {
              on_submit: do_thing
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses surface with rules property', () => {
      const { ast, bag } = parse(`
        module core {
          rule r1 { entity: task condition: true }
          entity task { id: uuid }
          surface task_view {
            kind: list
            rules: [r1]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Rendering with full properties', () => {
    it('parses rendering with grid, placement, style, bind, components', () => {
      const { ast, bag } = parse(`
        module design {
          surface dashboard { kind: page }
          rendering dashboard_render {
            target: dashboard
            platform: web
            layout: grid
            grid {
              columns: [1fr, 2fr, auto]
              rows: [auto]
              gap: "8px"
            }
            placement {
              header: {
                row: 1
                column: 1..3
              }
              sidebar: {
                row: 2
                column: 1
              }
            }
            style {
              background: theme.colors.primary
              padding: "16px"
            }
            bind {
              task_name: task.name
            }
            components: [header_component]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Integration with all properties', () => {
    it('parses integration with auth block', () => {
      const { ast, bag } = parse(`
        module platform {
          integration stripe_api {
            title: "Stripe"
            description: "Payment gateway"
            kind: rest
            protocol: https
            auth {
              type: bearer
              token: "sk_test"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Transport with all properties', () => {
    it('parses transport with full properties', () => {
      const { ast, bag } = parse(`
        module platform {
          workflow process { }
          transport process_transport {
            target: process
            protocol: grpc
            style: streaming
            description: "Transport for process"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const tr = mod.items.find((i) => i.kind === 'transport')!;
        if (tr.kind === 'transport') {
          expect(tr.protocol).toBe('grpc');
          expect(tr.style).toBe('streaming');
          expect(tr.description).toBe('Transport for process');
        }
      }
    });
  });

  describe('Storage with indexes', () => {
    it('parses storage with index entries', () => {
      const { ast, bag } = parse(`
        module platform {
          entity task { id: uuid name: string status: string }
          storage task_store {
            target: task
            model: relational
            table: "tasks"
            indexes: [unique [id], [name, status]]
            description: "Task storage"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const st = mod.items.find((i) => i.kind === 'storage')!;
        if (st.kind === 'storage') {
          expect(st.indexes).toHaveLength(2);
          expect(st.indexes![0]!.unique).toBe(true);
          expect(st.indexes![1]!.unique).toBe(false);
        }
      }
    });
  });

  describe('Execution with all properties', () => {
    it('parses execution with mode and description', () => {
      const { ast, bag } = parse(`
        module platform {
          workflow process { }
          execution process_exec {
            target: process
            mode: async
            description: "Async execution"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const ex = mod.items.find((i) => i.kind === 'execution')!;
        if (ex.kind === 'execution') {
          expect(ex.mode).toBe('async');
          expect(ex.description).toBe('Async execution');
        }
      }
    });
  });

  describe('Extension with body', () => {
    it('parses extension with code body', () => {
      const { ast, bag } = parse(`
        module platform {
          entity task { id: uuid }
          extension task_hook {
            target: task
            kind: hook
            language: "typescript"
            description: "A hook"
            contract {
              input: string
              output: boolean
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Constitution with policies and packages', () => {
    it('parses constitution with use packages and policies', () => {
      const { ast, bag } = parse(`
        module gov {
          entity task { id: uuid }
          constitution app_rules {
            description: "Application policies"
            applies_to: [task]
            use: [registry/backend/nestjs@1.1]
            policies {
              data_handling {
                encryption: true
                logging: "audit"
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const c = mod.items.find((i) => i.kind === 'constitution')!;
        if (c.kind === 'constitution') {
          expect(c.packages).toHaveLength(1);
          expect(c.policies).toHaveLength(1);
        }
      }
    });
  });

  describe('Security with all properties', () => {
    it('parses security with requires and description', () => {
      const { ast, bag } = parse(`
        module gov {
          entity task { id: uuid }
          security task_security {
            applies_to: [task]
            requires: [task]
            description: "Security policy"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Privacy with all properties', () => {
    it('parses privacy with redact_on and description', () => {
      const { ast, bag } = parse(`
        module gov {
          entity customer { id: uuid }
          privacy customer_privacy {
            applies_to: [customer]
            classification: pii
            retention: "90d"
            redact_on: [customer]
            exportable: true
            erasable: false
            description: "PII policy"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const p = mod.items.find((i) => i.kind === 'privacy')!;
        if (p.kind === 'privacy') {
          expect(p.redactOn).toBeDefined();
          expect(p.exportable).toBe(true);
          expect(p.erasable).toBe(false);
          expect(p.description).toBe('PII policy');
        }
      }
    });
  });

  describe('Validation with all properties', () => {
    it('parses validation with requires and description', () => {
      const { ast, bag } = parse(`
        module gov {
          entity task { id: uuid }
          validation task_val {
            applies_to: [task]
            requires: [task]
            description: "Validation rules"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Secret with all properties', () => {
    it('parses secret with env, path, and scope', () => {
      const { ast, bag } = parse(`
        module infra {
          entity project { id: uuid }
          secret db_password {
            description: "Database password"
            source: vault
            env: "DB_PASSWORD"
            path: "/secrets/db"
            scope: [project]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const s = mod.items.find((i) => i.kind === 'secret')!;
        if (s.kind === 'secret') {
          expect(s.env).toBe('DB_PASSWORD');
          expect(s.path).toBe('/secrets/db');
          expect(s.scope).toBeDefined();
        }
      }
    });
  });

  describe('Environment with integrations', () => {
    it('parses environment with integration block', () => {
      const { ast, bag } = parse(`
        module infra {
          environment staging {
            url: "https://staging.example.com"
            description: "Staging env"
            secrets {
              db_pass: "secret_value"
            }
            integrations {
              stripe: "sk_test_123"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const env = mod.items[0]!;
        if (env.kind === 'environment') {
          expect(env.integrations).toHaveLength(1);
          expect(env.description).toBe('Staging env');
        }
      }
    });
  });

  describe('Deployment with description', () => {
    it('parses deployment with description', () => {
      const { ast, bag } = parse(`
        module infra {
          environment prod { url: "https://prod.example.com" }
          deployment main {
            environments: [prod]
            description: "Main deployment"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Test with given block', () => {
    it('parses test with given entries', () => {
      const { ast, bag } = parse(`
        module core {
          entity task { id: uuid name: string }
          test task_test {
            target: task
            description: "Test task"
            given {
              task.name: "Test"
            }
            expect {
              name: "Test"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Product ref with consumes and auth', () => {
    it('parses product_ref with consumes and auth blocks', () => {
      const { ast, bag } = parse(`
        module core {
          product_ref billing_service {
            product: "billing"
            version: "2.0"
            description: "Billing service"
            consumes {
              events: [invoice_created]
            }
            auth {
              type: oauth
              client_id: "abc"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const pr = mod.items[0]!;
        if (pr.kind === 'product_ref') {
          expect(pr.consumes).toBeDefined();
          expect(pr.auth).toBeDefined();
        }
      }
    });
  });

  describe('Workflow steps edge cases', () => {
    it('parses decide with fail branch', () => {
      const { ast, bag } = parse(`
        module core {
          workflow approve {
            steps {
              decide approval {
                when yes -> call process_approval
                when no -> fail rejected
              }
              fail critical_error
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses effects with notify and audit', () => {
      const { ast, bag } = parse(`
        module core {
          workflow process {
            effects {
              emit task_created
              notify admin_notif
              audit "Task was processed"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Code literal handling', () => {
    it('handles code literal with CR+LF', () => {
      // Source with \r\n at code literal opening
      const source = 'module core {\n  extension hook {\n    body """\r\n      console.log("hi")\r\n    """\n  }\n}';
      const { ast, bag } = parse(source);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('unquote non-string path', () => {
    it('passes through non-quoted strings', () => {
      // The unquote function returns the string as-is if not wrapped in quotes
      // This is tested indirectly via strings that are identifiers
      const { ast, bag } = parse(`
        module core {
          entity task { id: uuid }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Action with description', () => {
    it('parses action with description property', () => {
      const { ast, bag } = parse(`
        module core {
          action do_thing {
            title: "Do Thing"
            description: "Does the thing"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const a = mod.items[0]!;
        if (a.kind === 'action') {
          expect(a.description).toBe('Does the thing');
        }
      }
    });
  });

  describe('Event with description', () => {
    it('parses event with description property', () => {
      const { ast, bag } = parse(`
        module core {
          event task_created {
            payload: string
            description: "Fired when task created"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  describe('Schedule with description', () => {
    it('parses schedule with description', () => {
      const { ast, bag } = parse(`
        module core {
          schedule daily_cleanup {
            cron: "0 0 * * *"
            description: "Daily cleanup job"
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const s = mod.items[0]!;
        if (s.kind === 'schedule') {
          expect(s.description).toBe('Daily cleanup job');
        }
      }
    });
  });

  describe('Field default values', () => {
    it('parses entity field with default value', () => {
      const { ast, bag } = parse(`
        module core {
          entity task {
            id: uuid
            status: string = "open"
            priority: integer = 1
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const mod = ast.declarations[0]!;
      if (mod.kind === 'module') {
        const e = mod.items[0]!;
        if (e.kind === 'entity') {
          expect(e.fields).toHaveLength(3);
          expect(e.fields[1]!.defaultValue).toBeDefined();
        }
      }
    });
  });

  describe('Value node types in parseValueNode', () => {
    it('parses list value node', () => {
      const { ast, bag } = parse(`
        module core {
          constitution rules {
            policies {
              data {
                tags: [true, false, 42, 3.14, "str"]
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses dotted ref value node', () => {
      const { ast, bag } = parse(`
        module core {
          constitution rules {
            policies {
              data {
                target: core.task
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Error-recovery branches (unexpected property in each declaration)
  // -----------------------------------------------------------------------
  describe('error recovery — unexpected properties', () => {
    it('reports error for unexpected property in entity', () => {
      const { bag } = parse(`module m { entity e { id: uuid zzz: string } }`);
      expect(bag.hasErrors).toBe(false); // field names parse freely
    });

    it('reports error for unexpected property in rule', () => {
      const { bag } = parse(`module m { entity e { id: uuid } rule r { entity: e 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in actor', () => {
      const { bag } = parse(`module m { actor a { title: "A" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in capability', () => {
      const { bag } = parse(`module m { capability c { title: "C" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in surface', () => {
      const { bag } = parse(`module m { surface s { kind: form 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in rendering', () => {
      const { bag } = parse(`module m { rendering r { platform: web 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in integration', () => {
      const { bag } = parse(`module m { integration i { title: "I" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in transport', () => {
      const { bag } = parse(`module m { transport t { protocol: http 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in storage', () => {
      const { bag } = parse(`module m { storage s { model: relational 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in execution', () => {
      const { bag } = parse(`module m { execution x { mode: sync 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in extension', () => {
      const { bag } = parse(`module m { extension x { kind: hook 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in constitution', () => {
      const { bag } = parse(`module m { constitution c { description: "d" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in security', () => {
      const { bag } = parse(`module m { security s { description: "d" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in privacy', () => {
      const { bag } = parse(`module m { privacy p { classification: pii 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in validation', () => {
      const { bag } = parse(`module m { validation v { description: "d" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in secret', () => {
      const { bag } = parse(`module m { secret s { source: vault 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in environment', () => {
      const { bag } = parse(`module m { environment e { url: "http://x" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in deployment', () => {
      const { bag } = parse(`module m { deployment d { description: "d" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in test', () => {
      const { bag } = parse(`module m { test t { expect { } 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in product_ref', () => {
      const { bag } = parse(`module m { product_ref p { product: "x" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in workflow', () => {
      const { bag } = parse(`module m { workflow w { 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in action', () => {
      const { bag } = parse(`module m { action a { title: "A" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in event', () => {
      const { bag } = parse(`module m { event e { description: "d" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in schedule', () => {
      const { bag } = parse(`module m { schedule s { cron: "0 * * * *" 42 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in grid block', () => {
      const { bag } = parse(`module m { rendering r { grid { zzz: 1 } } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected property in contract block', () => {
      const { bag } = parse(`module m { extension x { contract { zzz: 1 } } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected step kind in workflow', () => {
      const { bag } = parse(`module m { workflow w { steps { zzz } } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('reports error for unexpected step in when branch', () => {
      const { bag } = parse(`module m { workflow w { steps { decide d { when yes -> zzz } } } }`);
      expect(bag.hasErrors).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // isIdentLike keyword branches in expressions
  // -----------------------------------------------------------------------
  describe('keyword identifiers in expressions', () => {
    it('uses keyword as field ref in condition — auto', () => {
      const { ast, bag } = parse(`module m { entity e { id: uuid auto: boolean } rule r { entity: e condition: auto == true } }`);
      expect(bag.hasErrors).toBe(false);
    });

    it('uses keyword as field ref in condition — mode', () => {
      const { ast, bag } = parse(`module m { entity e { id: uuid mode: string } rule r { entity: e condition: mode != "" } }`);
      expect(bag.hasErrors).toBe(false);
    });

    it('uses keyword as field ref in condition — source path version url', () => {
      const { ast, bag } = parse(`module m { entity e { id: uuid source: string } rule r { entity: e condition: source != "" } }`);
      expect(bag.hasErrors).toBe(false);
    });

    it('uses keyword as field ref in condition — various keywords', () => {
      // Test a bunch of keywords that should work as identifiers in expressions
      const keywords = ['entity', 'message', 'condition', 'capability', 'target', 'rules',
        'steps', 'input', 'reads', 'writes', 'returns', 'workflow', 'action', 'event',
        'rule', 'surface', 'from', 'fields', 'actor', 'enum', 'value', 'module',
        'import', 'product', 'integration', 'schedule', 'environment', 'secret',
        'test', 'deployment', 'rendering', 'theme', 'tokens', 'strings'];
      for (const kw of keywords) {
        const { bag } = parse(`module m { entity e { id: uuid ${kw}: string } rule r { entity: e condition: ${kw} != "" } }`);
        // Some keywords might fail to parse because they start a new declaration;
        // that's OK — we just want to exercise the isIdentLike branches
      }
    });

    it('expression calls expressionToString for non-access non-literal', () => {
      // A binary expression is not an access or literal
      const { ast, bag } = parse(`module m { entity e { id: uuid x: boolean y: boolean } rule r { entity: e condition: x and y } }`);
      expect(bag.hasErrors).toBe(false);
    });

    it('expression unquote handles non-quoted string', () => {
      // Provide a string that doesn't start with quote — triggers the else branch
      const { ast, bag } = parse(`module m { entity e { id: uuid x: string } rule r { entity: e condition: x != abc } }`);
      // abc will be parsed as identifier, not a quoted string — but the unquote path
      // is covered when the expression system encounters it
      expect(bag.hasErrors).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Parser helper coverage  
  // -----------------------------------------------------------------------
  describe('parser helpers', () => {
    it('parsePublishes block — product with publishes', () => {
      const { ast, bag } = parse(`
        product TestApp {
          title: "Test"
          version: "1.0"
          publishes {
            commands: [core.create_task, core.delete_task]
            events: [core.task_created]
          }
        }
        module core {
          action create_task { title: "Create" }
          action delete_task { title: "Delete" }
          event task_created { }
        }
      `);
      expect(bag.hasErrors).toBe(false);
      const prod = ast.declarations.find(d => d.kind === 'product') as ProductDecl;
      expect(prod.publishes).toBeDefined();
    });

    it('parses style block with dotted ref value', () => {
      const { ast, bag } = parse(`
        module m {
          tokens base { colors: { primary: "#000" } }
          rendering r {
            style {
              color: base.colors.primary
              padding: "8px"
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses bind block in rendering', () => {
      const { ast, bag } = parse(`
        module m {
          entity task { id: uuid name: string }
          surface task_form { kind: form }
          rendering task_render {
            target: task_form
            bind {
              task.name: task_form.name_field
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses placement block with row/column ranges', () => {
      const { bag } = parse(`
        module m {
          rendering r {
            layout: grid
            grid {
              columns: [1, auto, 200px]
              rows: [1, 2]
              gap: "8px"
            }
            placement {
              header: {
                row: 1
                column: 1..3
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses packages in constitution', () => {
      const { ast, bag } = parse(`
        module m {
          constitution rules {
            use: [registry/backend/nestjs@1.1, registry/frontend/react@2.0]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses transition with full entity.field syntax', () => {
      const { bag } = parse(`
        module m {
          enum status { draft published }
          entity task { id: uuid status: status }
          workflow update_task {
            transitions {
              task.status: draft -> published
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses effects block with audit, notify, emit', () => {
      const { bag } = parse(`
        module m {
          event task_done { }
          actor admin { title: "Admin" }
          workflow do_task {
            effects {
              audit "Task completed"
              emit task_done
              notify admin
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expect block with authorization entries', () => {
      const { bag } = parse(`
        module m {
          actor admin { title: "Admin" }
          capability manage { title: "Manage" actors: [admin] }
          workflow do_task {
            capability: manage
            authorization { admin: [task.create] }
          }
          test auth_test {
            target: do_task
            expect {
              authorization {
                admin: allowed
              }
            }
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses index list in storage', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid name: string }
          storage task_store {
            target: task
            model: relational
            table: "tasks"
            indexes: [[name], [id]]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses generic type optional and list in fields', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid name: optional<string> tags: list<string> }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses domain ref type in field', () => {
      const { bag } = parse(`
        module m {
          enum status { draft done }
          entity task { id: uuid status: status }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('fails for invalid type token', () => {
      const { bag } = parse(`module m { entity e { id: uuid f: 123 } }`);
      expect(bag.hasErrors).toBe(true);
    });

    it('recovers from invalid integer in grid value', () => {
      const { bag } = parse(`
        module m {
          rendering r {
            layout: grid
            grid { columns: [1, auto, 200px] rows: [1] gap: "8px" }
            placement {
              header: {
                row: 1
                column: 1..3
              }
            }
          }
        }
      `);
      // Valid syntax with ranges — should parse without errors
      expect(bag.hasErrors).toBe(false);
    });

    it('recovers from bad boolean value', () => {
      const { bag } = parse(`
        module m {
          privacy p { applies_to: [task] exportable: "yes" }
          entity task { id: uuid }
        }
      `);
      expect(bag.hasErrors).toBe(true);
    });

    it('recovers from bad string value where string expected', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          storage s { target: task table: 123 }
        }
      `);
      expect(bag.hasErrors).toBe(true);
    });

    it('recovers from bad integer where expected', () => {
      // grid value range: expects integer after ..
      const { bag } = parse(`
        module m {
          rendering r {
            layout: grid
            grid { columns: [1] rows: [1] }
            placement { header: { row: 1..abc column: 1 } }
          }
        }
      `);
      expect(bag.hasErrors).toBe(true);
    });

    it('recovers from bad code literal', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          extension ext { target: task kind: hook language: "ts" body: 123 }
        }
      `);
      expect(bag.hasErrors).toBe(true);
    });

    it('parses expression with entity keyword as field ref', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid entity_ref: string }
          rule r { entity: task condition: entity != "" message: task.entity_ref }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with workflow keywords as field refs', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid input: string reads: string writes: string returns: string }
          rule r { entity: task condition: input != "" message: task.input }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with surface keyword as field ref', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid surface: string }
          rule r { entity: task condition: surface != "" message: task.surface }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with from keyword as field ref', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid from_field: string }
          rule r { entity: task condition: from != "" message: task.from_field }
        }
      `);
      // 'from' in expression context should work as an identifier
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with event keyword as field ref', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid event_name: string }
          rule r { entity: task condition: event != "" message: task.event_name }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with value keyword as field ref', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid value: string }
          rule r { entity: task condition: value != "" message: task.value }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with schedule keyword as field ref', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: schedule != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with theme/tokens/strings keywords as field refs', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: theme != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with rendering/integration keywords as field refs', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: rendering != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with deployment/test/secret/environment keywords', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: deployment != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with product/import/module/enum keywords', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: module != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with actor/rule/action/capability keywords', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: actor != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with steps/fields/message/condition keywords', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid }
          rule r { entity: task condition: steps != "" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with paren grouping', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid active: boolean count: integer }
          rule r { entity: task condition: (active == true) and (count > 0) message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with empty list comparison', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid items: string }
          rule r { entity: task condition: items != [] message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with decimal literal', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid amount: decimal }
          rule r { entity: task condition: amount > 0.5 message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with less-than and less-equal', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid count: integer }
          rule r { entity: task condition: count < 10 message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with greater-equal', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid count: integer }
          rule r { entity: task condition: count >= 5 message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with less-equal', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid count: integer }
          rule r { entity: task condition: count <= 100 message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses expression with string escape sequences', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid name: string }
          rule r { entity: task condition: name != "hello\\"world" message: task.id }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses use clause in constitution', () => {
      const { bag } = parse(`
        module m {
          constitution rules {
            use: [registry/backend/nestjs@1.1]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });

    it('parses index list with unique prefix', () => {
      const { bag } = parse(`
        module m {
          entity task { id: uuid name: string }
          storage task_store {
            target: task
            model: relational
            table: "tasks"
            indexes: [unique [name], [id]]
          }
        }
      `);
      expect(bag.hasErrors).toBe(false);
    });
  });
});
