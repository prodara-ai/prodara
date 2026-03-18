# Prodara Language Service

This document defines the capabilities and contracts of the Prodara language service for IDE integration.

The language service provides real-time feedback, navigation, and editing assistance for `.prd` files.

---

# Purpose

The language service exists to:

- provide real-time diagnostics as the developer edits
- support code navigation (go-to-definition, find-references)
- enable intelligent completions
- expose document structure
- make the Product Graph accessible from the editor

---

# Architecture

The language service is a long-running process that maintains an incremental compilation state.

    Editor ⟷ Language Service Protocol ⟷ Prodara Language Service
                                              ├─ Incremental Parser
                                              ├─ Incremental Binder
                                              ├─ Product Graph (in-memory)
                                              └─ Diagnostics Engine

The language service runs phases 1–10 of the compiler pipeline incrementally but does not run planning, generation, or verification.

---

# Required Capabilities

A conforming language service must support the following capabilities.

## Diagnostics

Emit diagnostics in real time as the user edits.

The diagnostic format matches `compiler/diagnostics.md`. Diagnostics are streamed incrementally using the JSON Lines format.

The service should:

- emit lexical and syntax diagnostics on every keystroke (debounced)
- emit resolution and semantic diagnostics after a short debounce period
- clear diagnostics for constructs that have been fixed

## Go-to-Definition

Navigate from a symbol reference to its declaration.

Supported reference kinds:

| Reference Kind             | Target                                    |
|----------------------------|-------------------------------------------|
| Import symbol              | Declaration in the source module          |
| Type reference in field    | Entity, value, or enum declaration        |
| Workflow `reads`/`writes`  | Entity declaration                        |
| Surface `binds`            | Entity declaration                        |
| Rendering `target`         | Surface declaration                       |
| Token path in rendering    | Token set category and token              |
| String reference           | String set key                            |
| Secret reference           | Secret declaration                        |
| Integration reference      | Integration declaration                   |
| `applies_to` targets       | Target constructs                         |
| `product_ref` consumed symbols | Published symbol in external product  |

## Find References

Find all locations where a symbol is referenced.

The service walks the bound symbol table and returns all reference locations for a given declaration.

## Completions

Provide context-aware completions.

### Keyword completions

Inside a module body, offer: `entity`, `workflow`, `surface`, `actor`, `capability`, `enum`, `value`, `rule`, `action`, `event`, `schedule`, `rendering`, `tokens`, `theme`, `strings`, `serialization`, `integration`, `transport`, `storage`, `execution`, `extension`, `constitution`, `security`, `privacy`, `validation`, `secret`, `environment`, `deployment`, `test`, `import`, `product_ref`.

### Property completions

Inside a construct body, offer the valid properties for that construct kind (e.g., `target:`, `kind:`, `contract {}` inside an extension).

### Symbol completions

In positions expecting a symbol reference (e.g., `binds:`, `reads:`, `applies_to:`), offer symbols of the expected type from the current scope.

### Import completions

After `import`, offer symbols exported by other modules. After `from`, offer module names.

## Document Outline

Provide a hierarchical document outline.

The outline should list:

- Product declaration
- Module declarations
- All construct declarations within each module
- Nested constructs (e.g., surfaces within surfaces)

## Hover Information

On hover, display:

- construct kind and name
- the Product Graph node ID
- field types (resolved)
- the source module for imported symbols
- documentation from `description` properties

## Rename Symbol

Rename a symbol across all files in the workspace.

The service must:

- rename the declaration
- rename all import references
- rename all usage references in other constructs
- validate that the new name does not conflict with existing symbols

## Code Actions

Provide automated fixes for common diagnostics:

| Diagnostic                  | Code Action                              |
|-----------------------------|------------------------------------------|
| Unresolved symbol           | Add import from the correct module       |
| Unused import               | Remove the import statement              |
| Missing authorization       | Add authorization block scaffold         |
| Missing test for workflow   | Add test declaration scaffold            |

---

# Incremental Update Strategy

The language service must be incremental to provide responsive feedback.

## File-level invalidation

When a file changes:

1. Re-tokenize and re-parse only that file
2. Rebuild AST for that file
3. Re-run module fragment collection for affected modules
4. Re-run binding for affected modules
5. Re-run validation for affected constructs
6. Update the in-memory Product Graph

## Cross-file invalidation

When a change affects symbols imported by other modules, the service must:

1. Identify dependent modules via the import graph
2. Re-bind and re-validate dependent modules
3. Emit updated diagnostics for all affected files

## Debouncing

The service should debounce rapid edits:

- Syntax diagnostics: 100ms debounce
- Semantic diagnostics: 300ms debounce
- Product Graph update: 500ms debounce

These values are recommendations; implementations may tune them.

---

# Product Graph Access

The language service should expose the in-memory Product Graph to editor extensions.

This allows:

- Product Graph visualization
- Dependency graph rendering
- Impact analysis preview
- Slice preview for generation planning

The exposed graph follows the same format as `model/product-graph-format.md` but may be partial or stale if a file has errors.

---

# Startup Behavior

On startup, the language service should:

1. Discover the `.prd` workspace
2. Check for `.prodara/graph.json` from the last build
3. If a cached graph exists, load it for instant navigation
4. Begin incremental compilation from source
5. Replace the cached graph with the live graph once compilation completes

This provides fast startup with eventual consistency.

---

## See Also

- `compiler/diagnostics.md` — diagnostic format and streaming
- `compiler/compilation-phases.md` — compiler phases 1–10
- `model/product-graph-format.md` — Product Graph format exposed to extensions
- `language/v0.1/core/symbol-resolution.md` — symbol resolution rules
