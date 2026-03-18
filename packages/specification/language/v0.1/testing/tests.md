# Prodara Language Specification v0.1
## Tests

Tests define **specification-level assertions** about product behavior and structure.

They validate the specification itself rather than generated implementation code. Tests execute against the **Product Graph** and its semantic evaluation context.

---

## Purpose of Tests

Tests protect semantic behavior such as:

- workflow transitions
- authorization expectations
- rule expectations

Tests ensure that specification changes do not silently break expected behavior.

---

## Test Declaration

Syntax (from `grammar.md`):

    test_decl
      = "test" identifier "{"
          "target" ":" symbol_ref
          [ "description" ":" string ]
          [ given_block ]
          expect_block
        "}" ;

Example:

    test issue_invoice_transition {

      target: issue_invoice

      given {
        invoice.status: draft
      }

      expect {
        transition: "invoice.status: draft -> issued"
        returns: ok
      }

    }

---

## Target

The `target` property identifies the semantic construct under test.

Common targets include:

- workflows
- rules
- security declarations

The target must resolve to a valid declaration in the module.

---

## Given

The `given` block describes assumed pre-condition state.

Entries are of the form:

    symbol_ref: value

Example:

    given {
      invoice.status: draft
    }

This creates a test context where the referenced field has the specified value.

The `given` block is optional. When omitted, the test asserts structural properties of the target rather than state-dependent behavior.

---

## Expect

The `expect` block describes semantic expectations.

### v0.1 Expectation Keys (Closed Set)

The following expectation keys are the **complete set** for v0.1. Any other key in an `expect` block is a compilation error.

| Key              | Value form                    | Applies to  |
|------------------|-------------------------------|-------------|
| `transition`     | string                        | workflows   |
| `returns`        | identifier                    | workflows   |
| `authorization`  | sub-block `{ actor: allowed/denied }` | workflows   |
| `valid_when`     | string (condition expression) | rules       |
| `invalid_when`   | string (condition expression) | rules       |

Future versions may add new expectation keys. Until then, the compiler **must** reject unrecognised keys with a diagnostic error.

### transition

Asserts that a workflow declares a specific state transition.

    transition: "entity.field: from_state -> to_state"

### returns

Asserts a workflow return branch name.

    returns: ok

### authorization

Asserts which actors are allowed or denied. Uses a sub-block:

    authorization {
      actor_name: allowed
      actor_name: denied
    }

### valid_when / invalid_when

Asserts that a rule evaluates as valid or invalid under the given state.

    valid_when: "condition_expression"
    invalid_when: "condition_expression"

These keys require sufficient state in the `given` block.

---

## Authorization Expectations

Example:

    expect {
      authorization {
        admin: allowed
        accountant: denied
      }
    }

## Compiler Responsibilities

The compiler or test runner verifies:

- test names are unique within their module
- `target` resolves to a valid declaration
- `given` references resolve to declared entity fields
- expectation keys belong to the v0.1 closed set (`transition`, `returns`, `authorization`, `valid_when`, `invalid_when`); any other key is a compilation error
- expectation values are structurally valid for their key type
- authorization actor names resolve to declared actors

Tests execute against the **Product Graph** and its semantic evaluation context.

See `compiler/spec-testing.md` for execution model details.
