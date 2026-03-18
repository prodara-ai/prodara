# Prodara Compilation Phases

This document defines the canonical phases of a Prodara compilation.

A conforming implementation may structure internal code differently, but it should preserve the meaning and ordering of these phases.

## Phase 1: Workspace discovery

The compiler discovers all relevant `.prd` files in the workspace.

Outputs:

- ordered source file list
- file hashes
- source map metadata

## Phase 2: Lexical analysis

Each source file is tokenized.

Outputs:

- token stream per file
- lexical diagnostics

## Phase 3: Parsing

Each token stream is parsed into an AST.

Outputs:

- AST per file
- syntax diagnostics

## Phase 4: Module fragment collection

The compiler groups declarations by module and collects open module fragments.

Outputs:

- module fragment map
- declaration inventory

## Phase 5: Symbol table construction

The compiler creates symbol tables for:

- products
- modules
- declarations
- imported aliases
- local declarations
- product_ref consumed symbols

Outputs:

- symbol index
- duplicate declaration diagnostics

## Phase 5b: Registry resolution

The compiler resolves all `use` references in constitutions and fetches registry packages (AGENTS.md / SKILL.md files, policies, schemas).

Outputs:

- resolved package set
- merged policy defaults
- registry diagnostics (unresolvable packages, hash mismatches)

## Phase 5c: Product reference resolution

The compiler resolves all `product_ref` declarations by loading dependency Product Graphs from `.prodara/products.json`.

Outputs:

- resolved external Product Graph snapshots
- validated `consumes` contracts against `publishes` blocks
- cross-product resolution diagnostics

## Phase 6: Symbol resolution

The compiler resolves references according to symbol resolution rules.

Outputs:

- bound references
- unresolved symbol diagnostics
- ambiguity diagnostics

## Phase 7: Type analysis

The compiler validates type expressions and type compatibility.

Outputs:

- resolved type graph
- type diagnostics

## Phase 8: Semantic validation

The compiler validates construct-level semantics such as:

- workflow transition validity
- rendering target validity
- string reference validity
- secret and environment reference validity

Outputs:

- semantic diagnostics

## Phase 9: Product Graph construction

The compiler constructs the Product Graph from validated declarations.

Outputs:

- Product Graph
- stable semantic IDs
- graph edge inventory

## Phase 10: Graph validation

The compiler validates graph-level invariants such as:

- missing graph links
- invalid cyclic dependencies where disallowed
- invalid policy application

Outputs:

- graph diagnostics

## Phase 11: Planning

The compiler loads the previous build state from `.prodara/` (see `compiler/build-state.md`) and computes the implementation plan by diffing the current Product Graph against the previous baseline (see `compiler/planning-engine.md`).

Outputs:

- full or incremental plan (`.prd.plan.json`)
- impacted node set
- task list (regenerate, revalidate, delete)

## Phase 11b: Graph slicing

The compiler slices the Product Graph into focused subgraphs for generation (see `compiler/graph-slicing.md`).

Each slice targets a generation category (backend, frontend, API, schema, runtime, test) and includes the root nodes, transitive dependencies, and applicable constitution context.

Outputs:

- graph slices per generation category
- slice validation diagnostics

## Phase 12: Generation

The compiler dispatches graph slices to generators (AI agents or deterministic emitters) following the generation protocol defined in `compiler/generation.md`.

This phase includes:

- loading AGENTS.md and SKILL.md from registry packages
- loading the artifact manifest to detect extension seams
- dispatching slices with instructions and existing artifact context
- receiving generated artifacts
- preserving extension seams during regeneration

Outputs:

- generated or updated artifacts
- extension seam preservation results
- generation diagnostics

## Phase 12b: Review/fix loop

If the constitution enables `review_fix_loop: true`, the compiler runs an automated quality loop (see `compiler/generation.md`).

The loop checks generated code for compile errors, lint issues, test failures, and policy violations, then attempts automated repair up to `max_fix_iterations` times.

Outputs:

- fixed artifacts
- review/fix diagnostics per iteration

## Phase 13: Verification

The compiler runs post-generation verification checks as defined in `compiler/verification.md`.

Checks include:

- artifact completeness (every plan task produced output)
- artifact consistency (all node references are valid)
- extension seam integrity
- spec test results
- constitution policy satisfaction
- graph-artifact alignment

Outputs:

- verification result (accepted or rejected)
- verification diagnostics

## Phase 14: Build output

On acceptance, the compiler writes the new build baseline to `.prodara/` (see `compiler/build-state.md`).

Outputs:

- `.prodara/build.json` — build metadata
- `.prodara/graph.json` — current Product Graph snapshot
- `.prodara/plan.json` — plan snapshot
- `.prodara/artifacts.json` — updated artifact manifest
- `.prd.diagnostics.json` — full diagnostic report

On rejection, only `build.json` (with `status: failed`) and the diagnostic report are written. The previous baseline is preserved.

## Phase contracts

Each phase should have a stable contract so that tooling can run subsets of the pipeline.

Examples:

- `validate` may stop after semantic validation (phases 1–8)
- `graph` may stop after Product Graph emission (phases 1–10)
- `plan` may stop after planning (phases 1–11b)
- `generate` runs all phases (1–14)
- `check` runs phases 1–10 plus spec tests, without generation

## Failure behavior

Compilation should stop when a phase produces unrecoverable errors. Earlier successful phase outputs may still be materialized for diagnostics and tooling.

If generation or verification fails, the previous build baseline is preserved as described in `compiler/build-state.md`.
