# Prodara Language Specification v0.1
## Validation

Validation defines **how Prodara specifications are checked for correctness**.

Validation is primarily a compiler/tooling responsibility, but it is specified formally so implementations remain consistent.

Validation occurs at several layers:

- lexical
- syntactic
- semantic
- graph-level
- test-level

---

# Validation Layers

## Lexical validation

Checks tokenization and source text correctness.

Examples:

• invalid identifiers  
• unterminated strings  
• invalid characters  

## Syntactic validation

Checks grammar conformance.

Examples:

• missing braces  
• malformed lists  
• invalid workflow branch syntax  

## Semantic validation

Checks meaning and symbol correctness.

Examples:

• unresolved symbols  
• invalid type references  
• invalid workflow targets  
• invalid transition state references  

## Graph-level validation

Checks complete compiled Product Graph coherence.

Examples:

• circular workflow dependencies where disallowed  
• missing rendering targets  
• invalid token references  
• invalid cross-module dependencies  

## Test-level validation

Checks authored spec tests.

Examples:

• test target exists  
• expectation references valid symbols  
• transition expectations are valid  

---

# Validation Declarations

Prodara v0.1 may optionally allow explicit validation policy declarations.

Example:

validation strict_defaults {

  applies_to: [
    billing
  ]

  requires: [
    no_unresolved_symbols,
    no_unused_imports,
    rendering_targets_exist,
    workflow_rules_exist
  ]

}

This is optional in v0.1 and may also remain compiler-only.

---

# Compiler Responsibilities

A conforming compiler must report validation failures with:

• file  
• line  
• column when available  
• construct  
• error category  
• explanation  

Validation must be deterministic.

---

# Best Practices

Validation should fail early and clearly.

Warnings may be supported, but unresolved semantic correctness issues must be errors.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `validation_decl`
- `model/product-graph.md` — Validation node type and edges
- `compiler/compiler-architecture.md` — compiler validation phases