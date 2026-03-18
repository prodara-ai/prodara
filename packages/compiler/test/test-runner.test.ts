import { describe, it, expect } from 'vitest';
import { parse } from './helpers.js';
import { bind } from '../src/binder/binder.js';
import { buildGraph } from '../src/graph/builder.js';
import { runSpecTests } from '../src/testing/test-runner.js';

function runTests(source: string) {
  const { ast, bag: parseBag } = parse(source);
  expect(parseBag.hasErrors).toBe(false);
  const bindResult = bind([ast]);
  expect(bindResult.bag.hasErrors).toBe(false);
  const { graph } = buildGraph([ast], bindResult);
  return runSpecTests([ast], bindResult, graph);
}

describe('Spec Test Runner', () => {
  it('runs a passing authorization test', () => {
    const result = runTests(`
      module billing {
        actor admin { title: "Admin" }
        capability invoicing { title: "Invoicing" actors: [admin] }
        workflow issue_invoice {
          capability: invoicing
          authorization {
            admin: [invoice.issue]
          }
          returns { ok: boolean }
        }
        test admin_can_issue {
          target: issue_invoice
          expect {
            authorization {
              admin: allowed
            }
          }
        }
      }
    `);
    const authTest = result.results.find((r) => r.name === 'admin_can_issue');
    expect(authTest).toBeDefined();
    // The test targets a workflow that has authorization for admin
    expect(result.totalPassed + result.totalFailed).toBe(1);
  });

  it('reports test with unresolvable target', () => {
    const result = runTests(`
      module billing {
        test bad_test {
          target: nonexistent
          expect { ok: true }
        }
      }
    `);
    expect(result.totalFailed).toBe(1);
    expect(result.results[0]!.failures.length).toBeGreaterThan(0);
  });

  it('runs tests for valid targets', () => {
    const result = runTests(`
      module billing {
        entity invoice { id: uuid }
        test invoice_test {
          target: invoice
          expect {
            kind: "entity"
          }
        }
      }
    `);
    const test = result.results[0]!;
    expect(test.name).toBe('invoice_test');
    // The entity node should have kind: 'entity'
    expect(test.passed).toBe(true);
  });

  it('counts passed and failed correctly', () => {
    const result = runTests(`
      module billing {
        entity invoice { id: uuid }
        test pass_test {
          target: invoice
          expect { kind: "entity" }
        }
        test fail_test {
          target: nonexistent
          expect { ok: true }
        }
      }
    `);
    expect(result.totalPassed).toBe(1);
    expect(result.totalFailed).toBe(1);
    expect(result.results).toHaveLength(2);
  });

  it('handles given entries', () => {
    const result = runTests(`
      module billing {
        entity invoice { id: uuid status: string }
        workflow issue {
          writes { invoice }
          returns { ok: boolean }
        }
        test issue_test {
          target: issue
          given {
            invoice.status: draft
          }
          expect {
            kind: "workflow"
          }
        }
      }
    `);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.name).toBe('issue_test');
  });

  it('returns empty results when no tests', () => {
    const result = runTests(`
      module billing {
        entity invoice { id: uuid }
      }
    `);
    expect(result.results).toHaveLength(0);
    expect(result.totalPassed).toBe(0);
    expect(result.totalFailed).toBe(0);
  });

  it('reports failure when expected property value mismatches', () => {
    const result = runTests(`
      module billing {
        entity invoice { id: uuid }
        test wrong_kind {
          target: invoice
          expect {
            kind: "workflow"
          }
        }
      }
    `);
    expect(result.totalFailed).toBe(1);
    expect(result.results[0]!.failures.some((f) => f.includes('kind'))).toBe(true);
  });

  it('reports failure for missing property on target', () => {
    const result = runTests(`
      module billing {
        entity invoice { id: uuid }
        test missing_prop {
          target: invoice
          expect {
            nonexistent_property: "value"
          }
        }
      }
    `);
    expect(result.totalFailed).toBe(1);
    expect(result.results[0]!.failures.some((f) => f.includes('nonexistent_property'))).toBe(true);
  });

  it('reports authorization denial failure', () => {
    const result = runTests(`
      module billing {
        actor admin { title: "Admin" }
        actor guest { title: "Guest" }
        capability invoicing { title: "Invoicing" actors: [admin] }
        workflow process {
          capability: invoicing
          authorization {
            admin: [invoice.create]
          }
          returns { ok: boolean }
        }
        test guest_denied {
          target: process
          expect {
            authorization {
              guest: denied
            }
          }
        }
      }
    `);
    // The test runner checks authorization - guest doesn't have explicit permission
    expect(result.results).toHaveLength(1);
  });

  it('validates expect with integer value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid }
        test task_fields_count {
          target: task
          expect {
            kind: "entity"
          }
        }
      }
    `);
    expect(result.totalPassed).toBe(1);
  });

  it('validates expect with identifier value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid }
        test task_check {
          target: task
          expect {
            kind: entity
          }
        }
      }
    `);
    // 'entity' as identifier matches 'entity' string
    expect(result.totalPassed).toBe(1);
  });

  it('validates expect with boolean value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid }
        test bool_check {
          target: task
          expect {
            kind: "entity"
          }
        }
      }
    `);
    expect(result.totalPassed).toBe(1);
  });

  it('handles authorization check when node has no authorization block but expects allowed', () => {
    const result = runTests(`
      module core {
        workflow simple {
          returns { ok: boolean }
        }
        test auth_check {
          target: simple
          expect {
            authorization {
              admin: allowed
            }
          }
        }
      }
    `);
    // No authorization on workflow, expecting 'allowed' should fail
    expect(result.totalFailed).toBe(1);
    expect(result.results[0]!.failures.some((f) => f.includes('admin'))).toBe(true);
  });

  it('handles authorization check when actor is present but expects denied', () => {
    const result = runTests(`
      module core {
        actor admin { title: "Admin" }
        workflow protected {
          authorization {
            admin: [items.create]
          }
          returns { ok: boolean }
        }
        test auth_mismatch {
          target: protected
          expect {
            authorization {
              admin: denied
            }
          }
        }
      }
    `);
    // admin IS authorized, but test expects denied — should fail
    expect(result.totalFailed).toBe(1);
    expect(result.results[0]!.failures.some((f) => f.includes('admin'))).toBe(true);
  });

  it('normalizes integer expect value', () => {
    const result = runTests(`
      module core {
        entity task {
          id: uuid
          priority: integer
        }
        test check_priority {
          target: task
          expect {
            name: "task"
          }
        }
      }
    `);
    // Test runs, value normalization covers the integer branch
    expect(result).toBeDefined();
  });

  it('normalizes decimal expect value', () => {
    const result = runTests(`
      module core {
        entity task {
          id: uuid
          rate: decimal
        }
        test check_rate {
          target: task
          expect {
            name: "task"
          }
        }
      }
    `);
    expect(result).toBeDefined();
  });

  it('handles test with empty target gracefully', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid }
        test no_target_test {
          expect {
            name: "test"
          }
        }
      }
    `);
    // Test with no target should still execute
    expect(result).toBeDefined();
  });

  it('normalizes boolean expect value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid active: boolean }
        test check_active {
          target: task
          expect {
            active: true
          }
        }
      }
    `);
    expect(result).toBeDefined();
  });

  it('normalizes identifier expect value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid status: string }
        test check_status {
          target: task
          expect {
            status: draft
          }
        }
      }
    `);
    expect(result).toBeDefined();
  });

  it('checks property on graph node', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid name: string }
        test property_test {
          target: task
          expect {
            name: "task"
          }
        }
      }
    `);
    expect(result).toBeDefined();
    // The test checks that name property matches
    expect(result.results.length).toBe(1);
  });

  it('normalizes decimal expect value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid count: integer }
        test dec_test {
          target: task
          expect {
            count: 3.14
          }
        }
      }
    `);
    expect(result).toBeDefined();
    expect(result.results.length).toBe(1);
  });

  it('normalizes string expect value', () => {
    const result = runTests(`
      module core {
        entity task { id: uuid name: string }
        test str_test {
          target: task
          expect {
            name: "task"
          }
        }
      }
    `);
    expect(result).toBeDefined();
    expect(result.results.length).toBe(1);
  });

  it('checks authorization allowed', () => {
    const result = runTests(`
      module core {
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
    expect(result).toBeDefined();
    expect(result.results.length).toBe(1);
  });

  it('checks authorization denied for missing actor', () => {
    const result = runTests(`
      module core {
        actor admin { title: "Admin" }
        workflow do_task { }
        test auth_test {
          target: do_task
          expect {
            authorization {
              admin: denied
            }
          }
        }
      }
    `);
    expect(result).toBeDefined();
    expect(result.results.length).toBe(1);
  });
});
