# Compiler Architecture

This document describes the internal architecture of the Prodara compiler.

## Design Principles

1. **Separation of phases** — Each compilation phase (lexing, parsing, binding, checking, graph building) is a distinct module with clear input/output contracts.
2. **Strong typing** — The entire codebase uses strict TypeScript with zero `any` types. AST nodes, graph nodes, and diagnostics are all typed discriminated unions.
3. **Deterministic output** — The same input always produces the same Product Graph and diagnostics. Timestamps in metadata are the only non-deterministic values.
4. **Diagnostic accumulation** — All phases accumulate diagnostics into a shared `DiagnosticBag` rather than throwing exceptions. Compilation continues through errors when possible.
5. **Agent-friendly contracts** — All output formats (graph, plan, diagnostics) have stable machine-readable JSON schemas.

## Phase Architecture

### 1. Source Discovery (`src/discovery/`)

Entry point: `discoverFiles(rootDir: string): SourceFile[]`

- Recursively walks the directory tree for `.prd` files
- Computes SHA-256 content hash per file
- Returns `SourceFile[]` with `path`, `relativePath`, `content`, and `hash`
- Deterministic file ordering (sorted by relative path)

### 2. Lexer (`src/lexer/`)

Entry point: `new Lexer(source: SourceFile).tokenize(): Token[]`

- Hand-written lexer — no external tokenizer dependency
- Produces a flat array of `Token` objects, each with `kind`, `text`, `line`, `column`, `pos`, `end`
- Recognizes: identifiers, keywords (50+), string literals, integer/decimal/dimension literals, code literals (`"""`), boolean literals, operators, punctuation
- Comments (`//`) are consumed and discarded
- Source locations are tracked for every token
- Unknown characters produce `TokenKind.Unknown` tokens with diagnostics

Key types:
- `TokenKind` — Enum of all token types
- `Token` — `{ kind, text, line, column, pos, end }`
- `SourceFile` — `{ path, relativePath, content, hash }`

### 3. Parser (`src/parser/`)

Entry point: `new Parser(tokens, file, diagnostics).parse(): AstFile`

- Hand-written recursive-descent parser
- Expression sub-parser uses Pratt precedence climbing for binary and comparison operators
- Produces a strongly-typed AST (`AstFile` → `TopLevelDecl[]` → `ModuleDecl`/`ProductDecl` → `ModuleItem[]`)
- AST nodes carry `SourceLocation` for all declarations and fields
- Error recovery via `error()` + `advance()` to allow multiple diagnostics per file
- No external parser library — full control for future language-service integration

AST design:
- `AstFile` contains top-level declarations
- `ProductDecl` — product root with title, version, modules list, publishes, packages
- `ModuleDecl` — module with imports and items
- `ModuleItem` — union of 30+ declaration types (entity, workflow, surface, etc.)
- Every declaration has a `name`, `kind` discriminant, `location`, and construct-specific properties
- Expression AST: `Access` (dotted paths), `BinaryOp`, `UnaryOp`, `Literal`, `Call`, `MemberAccess`

### 4. Binder (`src/binder/`)

Entry point: `bind(files: AstFile[]): BindResult`

- Merges multiple AST files into module-scoped symbol tables
- Resolves imports and aliases across modules
- Detects: duplicate declarations, unresolved symbols, ambiguous imports
- Produces `BindResult` with `modules` (module symbol tables), `allSymbols` (flat lookup), and accumulated diagnostics

Key types:
- `Symbol` — `{ name, nodeKind, module, declaration }`
- `ModuleSymbolTable` — per-module symbol map
- `BindResult` — `{ modules, allSymbols, product, diagnostics }`

### 5. Type Checker (`src/checker/`)

Entry points: `checkTypes(bind, diagnostics)` and `validate(files, bind, diagnostics)`

Type checking:
- Validates all `TypeExpr` references resolve to known primitives or declared types
- Checks generic wrappers (`optional<T>`, `list<T>`) have valid inner types
- Field types, input/output types, and contract types are all validated

Semantic validation:
- Workflow `transitions` reference valid state values
- Rendering targets reference valid surfaces
- Authorization references valid actors and capabilities
- Test targets reference valid symbols
- Constitution governance references valid modules
- Rule references resolve correctly
- Extension `attaches_to` targets exist
- String set and token reference validation
- Comprehensive cross-module validation

### 6. Product Graph Builder (`src/graph/`)

Entry point: `buildGraph(files, bind): { graph, diagnostics }`

- Transforms bound AST into the canonical Product Graph
- Creates typed nodes with stable semantic IDs (`<module>.<kind>.<name>`)
- Creates edges for all relationships (40 edge kinds)
- Product node aggregates module list, publish declarations, title/version
- Graph serialization to deterministic JSON via `serializeGraph(graph)`

Graph structure:
- `ProductGraph` — top-level container
- `ProductNode` — single product root
- `ModuleNode[]` — one per module, containing typed declaration arrays
- `GraphEdge[]` — typed directional edges
- `GraphMetadata` — compiler version, timestamp, source files

### 7. Planner (`src/planner/`)

Entry points: `diffGraphs(prev, next)`, `propagateImpact(changes, graph)`, `createPlan(changes, impacts)`

Semantic diffing:
- Compares two Product Graphs node-by-node
- Classifies changes: `added`, `removed`, `renamed`, `structurally_changed`, `behaviorally_changed`, `policy_changed`
- Structural vs behavioral classification based on edge topology changes

Impact propagation:
- Follows graph edges from changed nodes to determine transitive impact
- Tracks propagation depth and edge path for each impacted node

Plan generation:
- Maps changes + impacts to actionable tasks: `generate`, `regenerate`, `remove`, `verify`
- Produces a `Plan` artifact with stable JSON format

### 8. Spec Test Runner (`src/testing/`)

Entry point: `runSpecTests(files, bind, graph): SpecTestSuiteResult`

- Executes `test` declarations from `.prd` files
- Supports assertions: `exists`, `has_property`, `authorized_as`
- Resolves test targets to graph nodes
- Returns structured results: `passed`, `failed`, `total`, per-test details

### 9. Runtime Resolution (`src/runtime/`)

Entry point: `resolveRuntime(files, bind, graph, diagnostics)`

- Processes `secret`, `environment`, and `deployment` declarations
- Validates: environment includes, secret bindings, deployment targets
- Adds appropriate graph edges (e.g., `uses_secret`, `binds_secret`, `includes_env`)

### 10. Build State (`src/build-state/`)

Entry points: `readPreviousGraph(root)`, `writeBuildState(root, graph, plan, sourceFiles)`

- Manages `.prodara/` directory at workspace root
- Persists: `build.json` (build metadata + hashes), `graph.json`, `plan.json`
- Enables incremental compilation by providing previous graph for diffing

### 11. Generator Contracts (`src/generator/`)

Defines interfaces for future generator implementations and category-based graph slicing:
- `Generator` — interface with `generate()` and `verify()` methods
- `GeneratorDescriptor` — generator metadata (name, version, platforms, node kinds)
- `GeneratedArtifact` — output file with checksum and source node ID
- `GraphSlice` — subset of graph for targeted generation
- `sliceGraph(graph, category)` — extracts a connected subgraph by category using BFS transitive dependency walking
- `sliceAllCategories(graph)` — produces slices for all 6 categories

Slice categories: `backend`, `frontend`, `api`, `runtime`, `schema`, `test`. Each category has defined root node kinds, and the slicer walks transitive dependencies via graph edges, always including governance nodes.

### 12. Graph Validator (`src/graph/validator.ts`)

Entry point: `validateGraph(graph): GraphValidationResult`

Validates graph invariants after construction:
- All edge endpoints (source and target) reference existing nodes
- No self-referencing edges
- Product module list is consistent with actual module nodes
- Returns structured result with `valid` boolean and `errors` array

Diagnostics: PRD0500–PRD0503.

### 13. Registry Resolution (`src/registry/`)

Entry point: `resolveConstitutions(files, bind, diagnostics): ConstitutionResolutionResult`

- Extracts constitution `packages` references from the AST
- Parses package references (scoped packages, version specifiers)
- v0.1: local-only resolution — emits PRD0601 info diagnostics noting external packages are deferred
- Returns `ConstitutionResolutionResult` with `resolved` packages and `packageRefs`

### 14. Build Orchestration (`src/orchestrator/`)

Entry points: `createBuildRun(input)`, `createBuildSummary(input)`, `formatBuildSummary(summary)`

- `BuildRun` — tracks attempt with phases, artifacts, seams; ISO timestamps
- `BuildSummary` — high-level result: pass/fail, counts, phase summaries, task actions
- `formatBuildSummary()` — produces human-readable multi-line summary
- Types: `BuildInput`, `ArtifactEntry`, `ArtifactManifest`, `SeamEntry`, `PhaseSummary`

### 15. Configuration (`src/config/`)

Entry point: `loadConfig(root: string): ConfigResult`

- Loads and validates `prodara.config.json` from project root
- Returns `DEFAULT_CONFIG` when no config file exists
- Merges partial overrides into fully resolved `ResolvedConfig`
- `resolveConfig(partial)` — fills in defaults for phases, review/fix loop, and reviewer settings
- `priorityRank(priority)` — maps question priority to numeric rank for filtering

Configuration structure:
- `phases` — per-phase `agent` and `model` overrides, plus `clarify.maxQuestions` and `clarify.minimumQuestionPriority`
- `reviewFix` — `maxIterations` for the review/fix loop (default: 3)
- `reviewers` — per-reviewer `enabled` and `promptPath` overrides
- All 5 built-in reviewers enabled by default

### 16. Incremental Spec (`src/incremental/`)

Entry points: `buildIncrementalSpec(plan, graph)`, `serializeIncrementalSpec(spec)`

- Bridge between the Plan artifact and the workflow engine
- Enriches plan changes/impacts with node metadata (`nodeKind`, `module`)
- Computes summary counts (added, removed, modified, impacted, tasks)
- Produces 6 category slices using `sliceGraph`
- JSON serialization for machine consumption and artifact persistence

### 17. Reviewer Agents (`src/reviewers/`)

Entry points: `runReviewers(agents, configs, graph, spec)`, `runReviewFixLoop(agents, configs, graph, spec, maxIterations)`

Framework:
- `ReviewerAgent` interface — `name`, `description`, `review(graph, spec) → FindingArray`
- `runReviewers()` — runs all enabled agents, collects findings, computes pass/fail
- `runReviewFixLoop()` — iterates review cycles up to `maxIterations`, terminates on acceptance (no error/critical findings)

Built-in reviewers (all 5 are deterministic rule-based, no AI):
- **architecture** — validates module boundaries (empty modules, missing authorization on workflows, cross-module coupling density)
- **quality** — checks entity rule coverage, spec test presence, snake_case naming conventions
- **code-quality** — validates graph integrity (orphan nodes, invalid edges, duplicate edges)
- **specification** — ensures product module listing consistency, resolved imports, actionable surfaces
- **ux** — checks surface rendering presence, token definitions, rendering bindings, form validation rules

### 18. Workflow Phase Engine (`src/workflow/`)

Entry point: `runWorkflow(graph, spec, config): WorkflowResult`

6 sequential deterministic phases:
1. **specify** — categorizes changes (added/removed/modified/impacted), lists affected modules
2. **clarify** — generates questions about ambiguities (empty modules, missing auth, unresolved imports, missing fields, actionless surfaces); filters by priority and limits by `maxQuestions`
3. **plan** — produces implementation steps with dependencies from tasks
4. **tasks** — topologically sorts tasks using Kahn's algorithm, resolving inter-task dependencies via graph edges
5. **analyze** — risk assessment per task (inbound/outbound edge density, entity modification, removal); risk levels: low/medium/high
6. **implement** — generates implementation instructions with related edge context

All phases produce structured `PhaseResult<T>` with `ok`, `data`, and `warnings`. External AI agents consume these outputs; the engine performs no generative work.

### 19. Verification (`src/verification/`)

Entry point: `verify(graph, spec, workflow, reviewCycles): VerificationResult`

Final gate validating build integrity:
- **graph_edges_valid** — all edge endpoints reference existing graph nodes
- **modules_consistent** — product module list matches actual modules
- **tasks_present** — summary of task counts
- **workflow_phases** — validates all workflow phases completed successfully
- **review_acceptance** — checks last review cycle has no error/critical findings
- **constitution_present** — warns if no constitutions define governance

## Data Flow

```
                     ┌─────────────┐
    .prd files ────▶ │  Discovery  │
                     └──────┬──────┘
                            │ SourceFile[]
                     ┌──────▼──────┐
                     │    Lexer    │
                     └──────┬──────┘
                            │ Token[]
                     ┌──────▼──────┐
                     │   Parser    │
                     └──────┬──────┘
                            │ AstFile[]
                     ┌──────▼──────┐
                     │   Binder    │
                     └──────┬──────┘
                            │ BindResult
                  ┌─────────┤
                  │  ┌──────▼──────┐
                  │  │   Checker   │
                  │  └──────┬──────┘
                  │         │ (diagnostics)
                  │  ┌──────▼──────┐
                  │  │   Graph     │
                  │  │  Builder    │
                  │  └──────┬──────┘
                  │         │ ProductGraph
                  │  ┌──────▼──────┐
                  │  │   Graph     │
                  │  │ Validator   │
                  │  └──────┬──────┘
                  │         │
                  │  ┌──────▼──────┐
                  │  │  Registry   │
                  │  │ Resolution  │
                  │  └──────┬──────┘
                  │         │
          ┌───────┤    ┌────▼────┐
          │       │    │ Planner │
          │       │    └────┬────┘
          │       │         │ Plan
          │       │    ┌────▼────────────┐
          │       │    │  Incremental    │
          │       │    │     Spec        │
          │       │    └────┬────────────┘
          │       │         │ IncrementalSpec
          │       │    ┌────▼────────────┐
          │       │    │   Workflow      │
          │       │    │  Phase Engine   │
          │       │    └────┬────────────┘
          │       │         │ WorkflowResult
          │       │    ┌────▼────────────┐
          │       │    │   Review/Fix    │
          │       │    │     Loop        │
          │       │    └────┬────────────┘
          │       │         │ ReviewCycleResult
          │       │    ┌────▼────────────┐
          │       │    │  Verification   │
          │       │    └────┬────────────┘
          │       │         │ VerificationResult
     SpecTests  Build    Generator    Build
     Runner     State    Contracts  Orchestrator
```

All phases share a `DiagnosticBag` that accumulates errors and warnings. If errors are present after parsing/binding/checking, graph building may still proceed (for maximum diagnostic reporting) but the graph is flagged as potentially incomplete.

## File Organization

The repository is an npm workspaces monorepo with three packages:

- `packages/compiler/` — `@prodara/compiler` — the compiler core and workflow engine (66 source files, 20 modules)
- `packages/cli/` — `@prodara/cli` — thin global CLI wrapper (3 source files)
- `packages/specification/` — `@prodara/specification` — language specification, examples, and model documentation

Within the compiler package, each module follows a consistent pattern:
- `<module>/index.ts` — public barrel exports
- `<module>/<primary>.ts` — main implementation
- Supporting types and utilities as needed

The root `src/index.ts` re-exports everything needed by external consumers and the CLI.

## Design Decisions

### Hand-written parser over parser generators

Rationale:
1. Full control over error recovery and diagnostic quality
2. Natural support for future incremental re-parsing (language service)
3. No build-time code generation step
4. Easy to extend for new language constructs
5. Pratt precedence climbing gives clean expression parsing

### npm workspaces monorepo

The repository uses npm workspaces to separate the compiler core (`@prodara/compiler`), the global CLI wrapper (`@prodara/cli`), and the language specification (`@prodara/specification`):

1. `@prodara/compiler` is a project dependency — each project pins its own compiler version
2. `@prodara/cli` is installed globally — it resolves the local compiler and delegates, similar to `ng`/`tsc`
3. `@prodara/specification` contains the language spec, examples, model docs, and registry definitions
4. Version mismatch detection: the CLI checks major version compatibility with the local compiler
4. Clean separation: the CLI has no compiler logic, only resolution and delegation
5. Internal compiler modules still share types directly via barrel exports

### Discriminated unions over class hierarchies

The AST, type expressions, graph nodes, and diagnostics all use TypeScript discriminated unions (`kind` field). This gives:
1. Exhaustive switch checking at compile time
2. Natural JSON serialization
3. No class instantiation overhead
4. Easy pattern matching

### Diagnostic accumulation over exceptions

The compiler never throws for user errors. All diagnostics accumulate in a `DiagnosticBag`:
1. Multiple errors reported in a single compilation pass
2. Later phases can still run (best-effort) even with earlier errors
3. Machine-readable output naturally includes all diagnostics
4. No try/catch flow control
