# Prodara Specification Style Guide

This document defines authoring conventions for the `prodara-specification` repository.

Its purpose is to keep the specification:

- consistent
- readable
- deterministic
- friendly to AI systems and human contributors

## File organization

The repository should keep the language specification under:

- `language/v0.1/`

Supporting specifications should live in:

- `model/`
- `compiler/`
- `examples/`

## Writing style

Specification documents should prefer:

- short declarative sentences
- explicit “must / may / should” language where appropriate
- examples after rules
- section order of: purpose, syntax, semantics, compiler responsibilities, future extensions

Avoid:

- vague language
- implementation-specific assumptions unless explicitly intended
- long narrative digressions inside normative sections

## Normative language

Use the following conventions:

- **must**: required for conformance
- **should**: strongly recommended
- **may**: optional or implementation-defined

## Example formatting

Examples in specification files should use indented code blocks or fenced code blocks consistently within a file.

Examples should be valid Prodara unless marked as conceptual or future syntax.

## Cross references

References to other specification files should use repository-relative paths where practical.

Example:

- `language/v0.1/core/type-system.md`
- `model/product-graph.md`

## Evolution

When adding a new language construct:

1. update `language/v0.1/lexical.md` if new tokens or keywords are introduced
2. update `language/v0.1/grammar.md` if syntax changes
3. update the relevant construct specification file (or create one)
4. update `language/v0.1/core/symbol-resolution.md` if new reference behavior is introduced
5. update `language/v0.1/core/type-system.md` if new types or type rules are introduced
6. update `language/v0.1/governance/validation.md` if new validation rules are introduced
7. update `model/product-graph.md` to add new node types, edge families, and identity patterns
8. update `model/product-graph-format.md` to add the JSON schema for the new node type
9. update `compiler/compilation-phases.md` if new phases or phase behavior changes
10. update `compiler/compiler-architecture.md` if new subsystems are affected
11. update `registry/registry.md` if the construct interacts with registry packages
12. update relevant examples under `examples/` to exercise the new construct
13. add conformance fixtures under `testing/fixtures/` for valid and invalid cases

## AI friendliness

When possible, organize rules in a way that allows an LLM or parser author to answer:

- what is the syntax?
- what does it mean?
- what validations apply?
- what graph nodes and edges are created?
