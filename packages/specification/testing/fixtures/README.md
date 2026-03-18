# Compiler Fixtures

This folder contains valid and invalid fixtures for compiler and conformance testing.

## Valid Fixtures

- **minimal/** — minimal product with single module and entity
- **workflow-transitions/** — workflow with transitions, authorization, rules, and effects
- **multi-module/** — cross-module imports and references
- **governance/** — constitution, security, and privacy declarations
- **compound-rules/** — rules using `and`, `or`, `not`, and parenthesized expressions

## Invalid Fixtures

- **unresolved-symbol/** — reference to undeclared entity in workflow writes
- **ambiguous-import/** — duplicate import names from different modules
- **missing-module/** — import from a module that does not exist in the workspace
- **invalid-transition/** — workflow transition targeting a non-existent enum value
- **duplicate-entity/** — two entities with the same name in one module
