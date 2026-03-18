# Prodara Compiler Architecture

This document defines the high-level architecture of the Prodara compiler.

The Prodara compiler is responsible for transforming `.prd` source files into a validated semantic model and, eventually, implementation plans and generated artifacts.

The compiler is not a monolithic black box. It is a pipeline of explicit stages with clear contracts between them.

## Goals

The compiler architecture should:

- be deterministic
- support incremental compilation
- support high-quality diagnostics
- expose intermediate artifacts for tooling
- separate parsing from semantic analysis
- treat the Product Graph as the primary semantic contract

## Major subsystems

The compiler is composed of the following subsystems:

1. source discovery
2. lexical analysis
3. parsing
4. binding and symbol resolution
5. registry resolution
6. product reference resolution
7. semantic validation
8. Product Graph construction
9. planning
10. graph slicing
11. generation orchestration
12. verification
13. build state management

## Source discovery

The source discovery subsystem locates all `.prd` files in the workspace and builds the source set for compilation.

It should preserve:

- absolute path
- repository-relative path
- file content hash
- source provenance

## Lexical analysis

The lexer transforms source text into tokens according to `language/v0.1/lexical.md`.

The lexer must:

- preserve token locations
- classify keywords and identifiers correctly
- ignore comments for parsing while optionally preserving them for tooling

## Parsing

The parser consumes tokens and produces an abstract syntax tree.

The AST should preserve:

- declaration kinds
- declaration names
- property blocks
- source locations
- comments when needed for tooling

The parser must not perform semantic resolution.

## Binding and symbol resolution

The binder constructs module symbol tables and resolves imports and references.

This phase follows the rules in:

- `language/v0.1/core/modules.md`
- `language/v0.1/core/imports.md`
- `language/v0.1/core/symbol-resolution.md`

The output of this phase is a bound semantic model or symbol-bound AST.

## Registry resolution

The registry resolver processes `use` declarations in constitutions.

It follows the resolution protocol defined in `registry/registry.md`:

1. Check local vendored packages (`.prodara/registry/`)
2. Check custom Git registries (taps)
3. Check the official Prodara registry

Resolved packages provide AGENTS.md and SKILL.md files that instruct the generation system, along with default policies and configuration schemas.

The resolver merges package policies into the constitution and validates configuration against package schemas.

## Product reference resolution

The product reference resolver processes `product_ref` declarations.

It resolves external product dependencies using `.prodara/products.json`, loading the compiled Product Graph of each dependency.

The resolver validates:

- the dependency product's `publishes` block contains all consumed symbols
- version compatibility between the declared constraint and the dependency
- no circular product dependencies exist

Resolved external types become available in the symbol table for type-checking.

## Semantic validation

The semantic validator checks:

- type correctness
- symbol existence
- declaration uniqueness
- workflow correctness (transitions, steps, authorization)
- rendering correctness (target existence, token references)
- governance correctness (security, privacy, constitution targets)
- runtime correctness (secrets, environments, deployments)
- testing correctness (test targets, assertion validity)

The validator should operate on bound structures rather than raw source text.

## Product Graph construction

After successful binding and validation, the compiler constructs the Product Graph.

The Product Graph is the canonical semantic representation of the compiled specification and is defined in:

- `model/product-graph.md` — conceptual model (nodes, edges, semantics)
- `model/product-graph-format.md` — concrete JSON serialization format

The graph is serialized as a `.prd.graph.json` file and is the main contract between analysis and downstream systems.

## Planning

The planning subsystem computes the impact of a specification state on generated artifacts and implementation tasks.

Planning may operate in two modes:

- full compile planning
- incremental diff planning

Planning consumes the Product Graph and any previous graph snapshot from `.prodara/graph.json`.

## Graph slicing

The graph slicing subsystem extracts focused subgraphs from the Product Graph for generation (see `compiler/graph-slicing.md`).

Each slice targets a generation category (backend, frontend, API, schema, runtime, test) and includes root nodes, transitive dependencies, and applicable constitution context.

Graph slicing enables:

- parallel generation across independent slices
- targeted regeneration of only affected categories
- reduced generator complexity by narrowing scope

## Generation orchestration

The generation subsystem coordinates AI agents to produce implementation artifacts from Product Graph slices (see `compiler/generation.md`).

It loads AGENTS.md and SKILL.md files from resolved registry packages and dispatches graph slices to the appropriate agent based on construct kind and technology category.

Its responsibilities include:

- loading agent definitions and skills from registry packages
- selecting generation targets based on constitution policies
- passing graph slices to the appropriate agent
- preserving extension seams during regeneration
- coordinating review/fix loops
- producing stable, incremental outputs

## Verification

The verification subsystem runs post-generation checks to determine whether the build is accepted or rejected (see `compiler/verification.md`).

It validates:

- artifact completeness against the plan
- artifact consistency against the Product Graph
- extension seam integrity
- spec test results
- constitution policy satisfaction
- graph-artifact alignment

## Build state management

The build state subsystem manages the `.prodara/` directory and the persisted build baseline (see `compiler/build-state.md`).

It is responsible for:

- reading the previous build state on startup
- writing the new build baseline on success
- preserving the previous baseline on failure
- managing the artifact manifest
- detecting staleness (source hash or compiler version changes)

## Compiler outputs

A conforming compiler should be able to emit at least:

- diagnostics (`.prd.diagnostics.json`)
- Product Graph (`.prd.graph.json`)
- plan artifact (`.prd.plan.json`)
- artifact manifest (`.prodara/artifacts.json`)
- build metadata (`.prodara/build.json`)
- verification result
- generated implementation artifacts

## Incremental compilation

The compiler should support incremental compilation through:

- stable semantic IDs
- file hashes
- module ownership tracking
- dependency graph invalidation

The Product Graph should be diffable and partially rebuildable.

## Diagnostics

All compiler phases should emit structured diagnostics.

Diagnostics should include:

- phase
- severity
- file
- line and column if available
- semantic target if known
- explanation
- likely fix if available

## Recommended architecture boundary

A good implementation boundary is:

- parser owns syntax
- binder owns names
- validator owns correctness
- graph builder owns canonical semantics
- planner owns change impact
- generators own output

This separation keeps the compiler testable and evolvable.
