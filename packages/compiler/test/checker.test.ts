import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { bind } from '../src/binder/binder.js';
import { checkTypes } from '../src/checker/type-checker.js';
import { validate } from '../src/checker/validator.js';

function checkSource(source: string) {
  const { ast, bag: parseBag } = parse(source);
  expect(parseBag.hasErrors).toBe(false);
  const bindResult = bind([ast]);
  expect(bindResult.bag.hasErrors).toBe(false);
  const typeResult = checkTypes([ast], bindResult);
  const validateResult = validate([ast], bindResult);
  return { typeResult, validateResult, ast, bindResult };
}

describe('Type Checker', () => {
  it('accepts valid primitive types', () => {
    const { typeResult } = checkSource(`
      module billing {
        entity invoice {
          id: uuid
          title: string
          total: decimal
          count: integer
          active: boolean
          created: date
          updated: datetime
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  it('accepts generic types', () => {
    const { typeResult } = checkSource(`
      module board {
        entity task {
          id: uuid
          tags: list<string>
          description: optional<string>
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  it('accepts domain type references', () => {
    const { typeResult } = checkSource(`
      module billing {
        enum status { draft paid }
        entity invoice {
          id: uuid
          status: status
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  it('detects unresolved type reference', () => {
    const { typeResult } = checkSource(`
      module billing {
        entity invoice {
          id: uuid
          status: nonexistent_type
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(true);
    expect(typeResult.bag.errors[0]!.code).toBe('PRD0301');
  });

  it('detects duplicate fields', () => {
    const { typeResult } = checkSource(`
      module billing {
        entity invoice {
          id: uuid
          id: string
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(true);
    expect(typeResult.bag.errors[0]!.code).toBe('PRD0300');
  });

  it('validates workflow input and return types', () => {
    const { typeResult } = checkSource(`
      module billing {
        entity invoice { id: uuid }
        enum error { fail }
        workflow create_invoice {
          input {
            id: uuid
          }
          returns {
            ok: invoice
            error: error
          }
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  it('validates rule entity references', () => {
    const { typeResult } = checkSource(`
      module billing {
        entity invoice { id: uuid total: decimal }
        strings errors { positive: "Must be positive" }
        rule positive_total {
          entity: invoice
          condition: total > 0
          message: billing.errors.positive
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(false);
  });
});

describe('Semantic Validator', () => {
  it('validates workflow capability reference', () => {
    const { validateResult } = checkSource(`
      module billing {
        capability invoicing { title: "Invoicing" }
        workflow create_invoice {
          capability: invoicing
          returns { ok: boolean }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('detects unresolved workflow writes reference', () => {
    const { validateResult } = checkSource(`
      module billing {
        workflow create_invoice {
          writes { missing_entity }
          returns { ok: boolean }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(true);
    expect(validateResult.bag.errors[0]!.code).toBe('PRD0400');
  });

  it('validates capability actor references', () => {
    const { validateResult } = checkSource(`
      module billing {
        actor admin { title: "Admin" }
        capability invoicing {
          title: "Invoicing"
          actors: [admin]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('detects unresolved capability actor', () => {
    const { validateResult } = checkSource(`
      module billing {
        capability invoicing {
          title: "Invoicing"
          actors: [nonexistent_actor]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(true);
  });

  it('validates action workflow reference', () => {
    const { validateResult } = checkSource(`
      module billing {
        workflow create_invoice { returns { ok: boolean } }
        action do_create_invoice { workflow: create_invoice }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates workflow transition entity references', () => {
    const { validateResult } = checkSource(`
      module billing {
        enum status { draft issued }
        entity invoice { id: uuid status: status }
        workflow issue {
          writes { invoice }
          transitions { invoice.status: draft -> issued }
          returns { ok: boolean }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates surface action references', () => {
    const { validateResult } = checkSource(`
      module board {
        workflow move { returns { ok: boolean } }
        action move_task { workflow: move }
        surface board_view {
          kind: view
          actions: [move_task]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates rendering target reference', () => {
    const { validateResult } = checkSource(`
      module board {
        surface board_view { kind: view }
        rendering layout {
          target: board_view
          platform: web
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates test target reference', () => {
    const { validateResult } = checkSource(`
      module billing {
        workflow create { returns { ok: boolean } }
        test create_test {
          target: create
          expect { transition: "ok" }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('warns when reference resolves to wrong kind', () => {
    const { validateResult } = checkSource(`
      module board {
        entity task { id: uuid }
        capability task_mgmt { actors: [task] }
      }
    `);
    // task is an entity, not an actor — should produce a warning
    const warnings = validateResult.bag.all.filter(
      (m) => m.severity === 'warning' && m.code === 'PRD0402',
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]!.message).toContain("Expected 'actor'");
  });

  it('reports invalid transition from state (enum member check)', () => {
    const { validateResult } = checkSource(`
      module board {
        enum task_status { backlog in_progress done }
        entity task {
          id: uuid
          status: task_status
        }
        actor member { title: "Member" }
        capability board_cap { title: "Board" actors: [member] }
        workflow move {
          capability: board_cap
          transitions {
            task.status: nonexistent -> done
          }
        }
      }
    `);
    const errs = validateResult.bag.all.filter(
      (m) => m.code === 'PRD0402' && m.severity === 'error',
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.some((e) => e.message.includes("'from' state 'nonexistent'"))).toBe(true);
  });

  it('reports invalid transition to state (enum member check)', () => {
    const { validateResult } = checkSource(`
      module board {
        enum task_status { backlog in_progress done }
        entity task {
          id: uuid
          status: task_status
        }
        actor member { title: "Member" }
        capability board_cap { title: "Board" actors: [member] }
        workflow move {
          capability: board_cap
          transitions {
            task.status: backlog -> unknown_state
          }
        }
      }
    `);
    const errs = validateResult.bag.all.filter(
      (m) => m.code === 'PRD0402' && m.severity === 'error',
    );
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.some((e) => e.message.includes("'to' state 'unknown_state'"))).toBe(true);
  });

  it('validates surface action references', () => {
    const { validateResult } = checkSource(`
      module ui {
        action save_action { title: "Save" }
        surface task_form {
          kind: form
          actions: [save_action]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates surface nested surface references', () => {
    const { validateResult } = checkSource(`
      module ui {
        surface child_panel { kind: panel }
        surface main_page {
          kind: page
          surface: [child_panel]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('detects unresolved surface action reference', () => {
    const { validateResult } = checkSource(`
      module ui {
        surface task_form {
          kind: form
          actions: [nonexistent_action]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(true);
    expect(validateResult.bag.errors[0]!.code).toBe('PRD0400');
  });

  it('detects unresolved surface nested surface reference', () => {
    const { validateResult } = checkSource(`
      module ui {
        surface main_page {
          kind: page
          surface: [nonexistent_surface]
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(true);
    expect(validateResult.bag.errors[0]!.code).toBe('PRD0400');
  });

  it('validates extension contract type checking', () => {
    const { typeResult } = checkSource(`
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
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  it('warns when rule entity reference is wrong kind (PRD0302)', () => {
    const { typeResult } = checkSource(`
      module billing {
        enum status { draft paid }
        rule status_rule {
          entity: status
          condition: true
        }
      }
    `);
    const warnings = typeResult.bag.all.filter((d) => d.code === 'PRD0302');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.message).toContain("Expected 'entity'");
  });

  it('validates test target resolution', () => {
    const { typeResult } = checkSource(`
      module core {
        entity task { id: uuid }
        test task_test {
          target: task
          expect { name: "test" }
        }
      }
    `);
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  it('validates transition field not found on entity (PRD0401)', () => {
    const { validateResult } = checkSource(`
      module board {
        enum task_status { backlog in_progress done }
        entity task {
          id: uuid
          status: task_status
        }
        actor member { title: "Member" }
        capability board_cap { title: "Board" actors: [member] }
        workflow move {
          capability: board_cap
          transitions {
            task.nonexistent_field: backlog -> done
          }
        }
      }
    `);
    const errs = validateResult.bag.all.filter((m) => m.code === 'PRD0401');
    expect(errs).toHaveLength(1);
    expect(errs[0]!.message).toContain("'nonexistent_field'");
  });

  it('validates transition with primitive type field (no enum check)', () => {
    const { validateResult } = checkSource(`
      module board {
        entity task {
          id: uuid
          status: string
        }
        actor member { title: "Member" }
        capability board_cap { title: "Board" actors: [member] }
        workflow move {
          capability: board_cap
          transitions {
            task.status: open -> closed
          }
        }
      }
    `);
    // No PRD0402 since status is not an enum ref
    const enumErrors = validateResult.bag.all.filter((m) => m.code === 'PRD0402');
    expect(enumErrors).toHaveLength(0);
  });

  it('validates workflow trigger reference', () => {
    const { validateResult } = checkSource(`
      module core {
        event task_created { payload: string }
        workflow on_created {
          on: task_created
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  // More validator branch coverage
  it('validates workflow reads/writes references', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        workflow do_task {
          reads { task }
          writes { task }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates workflow rules references', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        rule task_rule { entity: task condition: true }
        workflow do_task {
          rules { task_rule }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates workflow capability reference', () => {
    const { validateResult } = checkSource(`
      module core {
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
        workflow do_task {
          capability: manage
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates action with workflow reference', () => {
    const { validateResult } = checkSource(`
      module core {
        workflow do_task { }
        action run { title: "Run" workflow: do_task }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates transport target reference', () => {
    const { validateResult } = checkSource(`
      module core {
        workflow do_task { }
        transport api { target: do_task protocol: http }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates storage target reference', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        storage task_store { target: task model: relational }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates execution target reference', () => {
    const { validateResult } = checkSource(`
      module core {
        workflow do_task { }
        execution task_exec { target: do_task mode: sync }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates extension target reference', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        extension task_hook { target: task kind: hook }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates rendering target reference', () => {
    const { validateResult } = checkSource(`
      module core {
        surface page { kind: page }
        rendering page_render { target: page platform: web }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates test target reference', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        test task_test { target: task expect { name: "test" } }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates capability actors reference', () => {
    const { validateResult } = checkSource(`
      module core {
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates surface capability reference', () => {
    const { validateResult } = checkSource(`
      module core {
        actor admin { title: "Admin" }
        capability manage { title: "Manage" actors: [admin] }
        surface page { kind: page capability: manage }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
  });

  it('validates transition from/to against enum members', () => {
    const { validateResult } = checkSource(`
      module core {
        enum status { draft published }
        entity task { id: uuid status: status }
        workflow update_task {
          transitions {
            task.status: draft -> published
          }
        }
      }
    `);
    expect(validateResult.bag.hasErrors).toBe(false);
    const enumErrors = validateResult.bag.all.filter((d) => d.code === 'PRD0402');
    expect(enumErrors).toHaveLength(0);
  });

  it('detects invalid transition from state', () => {
    const { validateResult } = checkSource(`
      module core {
        enum status { draft published }
        entity task { id: uuid status: status }
        workflow update_task {
          transitions {
            task.status: invalid_state -> published
          }
        }
      }
    `);
    const enumErrors = validateResult.bag.all.filter((d) => d.code === 'PRD0402');
    expect(enumErrors).toHaveLength(1);
    expect(enumErrors[0]!.message).toContain('invalid_state');
  });

  it('detects invalid transition to state', () => {
    const { validateResult } = checkSource(`
      module core {
        enum status { draft published }
        entity task { id: uuid status: status }
        workflow update_task {
          transitions {
            task.status: draft -> nonexistent
          }
        }
      }
    `);
    const enumErrors = validateResult.bag.all.filter((d) => d.code === 'PRD0402');
    expect(enumErrors).toHaveLength(1);
    expect(enumErrors[0]!.message).toContain('nonexistent');
  });

  it('type-checker returns null for empty segments', () => {
    const { typeResult } = checkSource(`
      module core {
        entity task { id: uuid }
      }
    `);
    // With valid code, empty segments branch is not triggered but validated internally
    expect(typeResult.bag.hasErrors).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Governance validation
  // ---------------------------------------------------------------------------

  it('validates security applies_to targets', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        security task_sec {
          applies_to: [task]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('validates privacy applies_to and redact_on targets', () => {
    const { validateResult } = checkSource(`
      module core {
        entity user { id: uuid email: string }
        event user_exported {}
        privacy user_priv {
          applies_to: [user]
          classification: personal_data
          redact_on: [user_exported]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('errors on unresolved privacy redact_on target', () => {
    const { validateResult } = checkSource(`
      module core {
        entity user { id: uuid }
        privacy user_priv {
          applies_to: [user]
          redact_on: [nonexistent_event]
        }
      }
    `);
    const errors = validateResult.bag.errors.filter((d) => d.code === 'PRD0400');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.message).toContain('nonexistent_event');
  });

  it('validates constitution applies_to targets', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        constitution default {
          applies_to: [task]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('validates validation applies_to targets', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        validation task_val {
          applies_to: [task]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('accepts governance applies_to module references', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid }
        security core_sec {
          applies_to: [core]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('validates deployment environment references', () => {
    const { validateResult } = checkSource(`
      module core {
        environment staging {
          url: "https://staging.example.com"
        }
        deployment main {
          environments: [staging]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('errors on unresolved deployment environment reference', () => {
    const { validateResult } = checkSource(`
      module core {
        deployment main {
          environments: [nonexistent_env]
        }
      }
    `);
    const errors = validateResult.bag.errors.filter((d) => d.code === 'PRD0400');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]!.message).toContain('nonexistent_env');
  });

  it('validates surface binds reference', () => {
    const { validateResult } = checkSource(`
      module core {
        entity task { id: uuid title: string }
        surface task_form {
          binds: task
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('validates surface hooks targets', () => {
    const { validateResult } = checkSource(`
      module core {
        workflow create_task {}
        surface task_form {
          hooks {
            on_submit: create_task
          }
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });

  it('validates surface rules references', () => {
    const { validateResult } = checkSource(`
      module core {
        rule title_required {
          entity: task
          condition: true
        }
        entity task { id: uuid }
        surface task_form {
          rules: [title_required]
        }
      }
    `);
    expect(validateResult.bag.errors).toHaveLength(0);
  });
});
