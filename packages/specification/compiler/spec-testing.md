# Prodara Spec Testing

This document defines how specification tests are executed.

Prodara specification tests validate the semantic behavior of the specification itself. They are not implementation unit tests.

## Inputs

Spec testing consumes:

- Product Graph
- authored `test` declarations
- generated/spec-synthesized validation cases
- optional prior graph snapshots
- conformance fixtures where applicable

## Test kinds

### Authored tests

Tests explicitly declared using the `test` construct.

### Synthesized tests

Compiler-generated checks derived automatically from the Product Graph. Synthesized tests verify invariants that the specification implies but that the developer does not need to write explicitly.

#### Synthesized test categories

| Category                     | Source Construct       | What Is Checked                                           |
|------------------------------|------------------------|-----------------------------------------------------------|
| Transition coverage          | workflow               | Every declared transition has valid from/to enum members  |
| Authorization completeness   | workflow + capability  | Every actor in the capability is either allowed or denied |
| Security coverage            | surface, workflow      | Every surface and workflow with a capability has a security governance |
| Privacy coverage             | entity                 | Every entity with sensitive fields has a privacy governance |
| Localization completeness    | strings, surface, rule | Every string reference resolves to a defined key          |
| Rule target validity         | rule                   | Every rule references fields that exist on its target entity |
| Serialization consistency    | surface, transport     | Every surface with a transport has a serialization policy |
| Extension contract validity  | extension              | Every extension contract references valid types           |
| Import hygiene               | module                 | No unused imports; no missing imports for referenced symbols |

#### Synthesized test behavior

Synthesized tests are generated after Product Graph construction and before authored tests run. They are:

- deterministic (same graph always produces the same tests)
- tagged with `synthesized: true` in test results
- subject to constitution policy (can be suppressed with `synthesized_tests: false`)
- reported separately from authored tests in diagnostics

### Coherence checks

Graph-level validations treated as mandatory correctness checks.

## Execution model

Spec tests run after Product Graph construction and semantic validation.

Typical order:

1. validate graph
2. load authored tests
3. synthesize implicit tests
4. execute assertions against graph semantics
5. report results

## Example assertions

The following expectation keys are the **complete closed set** for v0.1 `expect` blocks. Any unrecognised key is a compilation error.

| Key              | Value form                    | Applies to  |
|------------------|-------------------------------|-------------|
| `transition`     | string                        | workflows   |
| `returns`        | identifier                    | workflows   |
| `authorization`  | sub-block `{ actor: allowed/denied }` | workflows   |
| `valid_when`     | string (condition expression) | rules       |
| `invalid_when`   | string (condition expression) | rules       |

### transition

Asserts that a workflow declares a specific state transition.

Example:

    expect {
      transition: "invoice.status: draft -> issued"
    }

### returns

Asserts a workflow return branch.

Example:

    expect {
      returns: ok
    }

### authorization

Asserts which actors are allowed or denied by the workflow's authorization block.

Example:

    expect {
      authorization {
        admin: allowed
        accountant: denied
      }
    }

### valid_when / invalid_when

Asserts that a rule passes or fails under a given state.

Example:

    expect {
      valid_when: "total.amount > 0"
    }

The precise semantics of `valid_when` and `invalid_when` require that the `given` block provides sufficient state for evaluation.

## CI behavior

A failing spec test should fail CI unless explicitly configured otherwise by constitution or validation policy.

## Fixtures

Conformance fixtures under `testing/fixtures/` should be executable independently of authored in-spec tests.

Fixtures are especially useful for parser, binder, validator, and Product Graph regression coverage.

## Diagnostics

Spec test failures should include:

- test name
- target
- failed expectation
- relevant semantic context
- location of test declaration where possible

---

## See Also

- `compiler/compilation-phases.md` — spec tests run during phases 10 and 13
- `compiler/verification.md` — spec test results are checked during verification
- `compiler/diagnostics.md` — diagnostic format for test failures (PRD0800–0899)
- `language/v0.1/testing/tests.md` — `test` declaration syntax
