# CLI Usage Reference

The Prodara CLI provides commands for building products, validating specifications, building Product Graphs, producing incremental plans, running spec tests, and checking installation health.

## Installation

### Global CLI

```bash
npm install -g @prodara/cli
```

The global CLI (`@prodara/cli`) is a thin wrapper that resolves the project-local `@prodara/compiler` from `node_modules` and delegates all commands. It checks major version compatibility and prints a helpful error if no local compiler is found.

### Project-local compiler

```bash
cd my-project
npm install @prodara/compiler
```

The compiler can also be used directly via `npx prodara` from a project with `@prodara/compiler` installed.

## Global Options

| Option | Description |
|--------|-------------|
| `--version` | Print compiler version |
| `-h, --help` | Print help for any command |

## Commands

### `prodara build [path]` (default)

Full build pipeline: validate → graph → plan → incremental spec → workflow → review/fix → verify → test. This is the **default command** — running `prodara` with no subcommand invokes `build`.

```bash
# Human-readable summary (default)
prodara build ./my-project

# Machine-readable JSON summary
prodara build --format json ./my-project

# Equivalent (build is default)
prodara ./my-project
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `human` or `json` | `human` |

**Exit codes:**
- `0` — Build succeeded (all phases passed, all tests passed, verification passed)
- `1` — Build failed (compilation errors, test failures, or verification failures)

**Human output example:**

```
Build Summary
  Status:   PASS
  Files:    4
  Errors:   0
  Warnings: 0
  Tests:    12 passed, 0 failed
  Tasks:    generate: 8, verify: 4
  Workflow:  6 phases completed
  Review:   accepted (0 critical, 0 error findings)
  Verify:   PASS (5 checks passed, 0 failed)
```

**JSON output:** A `BuildSummary` object with `status`, `fileCount`, `errorCount`, `warningCount`, test summary, task action counts, workflow results, review cycle results, and verification results.

---

### `prodara init [name]`

Scaffold a new Prodara project directory with starter files.

```bash
prodara init my-project
cd my-project
```

Creates:
- `<name>/app.prd` — starter product specification
- `<name>/prodara.config.json` — workspace configuration

If the directory already exists and contains an `app.prd`, the command exits with a message.

---

### `prodara upgrade [path]`

Update an existing Prodara project to the latest version. Ensures all required directories and config keys exist, updates the compiler, and optionally regenerates slash commands.

```bash
prodara upgrade
prodara upgrade ./my-project --ai copilot
prodara upgrade --skip-install --format json
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--ai <agent>` | Regenerate AI agent slash commands | — |
| `--ai-commands-dir <dir>` | Custom slash-command directory (with `--ai generic`) | — |
| `--skip-install` | Skip npm update of `@prodara/compiler` | `false` |
| `--format <format>` | `human` or `json` | `human` |

The command exits with an error if the directory is not a Prodara project (`.prodara/` not found).

---

### `prodara validate [path]`

Parse and validate `.prd` files. Reports syntax errors, resolution errors, type errors, and semantic errors without building a graph.

```bash
# Human-readable output (default)
prodara validate ./my-project

# Machine-readable JSON
prodara validate --format json ./my-project
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `human` or `json` | `human` |

**Exit codes:**
- `0` — No errors (warnings may still be present)
- `1` — One or more errors found

**JSON output schema:**

```json
{
  "format": "prodara-diagnostics",
  "version": "0.1.0",
  "diagnostics": [
    {
      "phase": "parser",
      "category": "syntax_error",
      "severity": "error",
      "code": "PRD0010",
      "message": "Expected '{', got 'EOF'",
      "file": "app.prd",
      "line": 10,
      "column": 1
    }
  ],
  "summary": {
    "errors": 1,
    "warnings": 0
  }
}
```

---

### `prodara graph [path]`

Compile `.prd` files and emit the Product Graph.

```bash
# JSON to stdout (default)
prodara graph ./my-project

# Write to file
prodara graph --output build/graph.json ./my-project

# Human-readable summary
prodara graph --format human ./my-project
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `human` or `json` | `json` |
| `--output <file>` | Write graph to file | stdout |

**Exit codes:**
- `0` — Graph built successfully
- `1` — Compilation errors (diagnostics emitted to stderr)

**JSON output schema:**

```json
{
  "format": "prodara-product-graph",
  "version": "0.1.0",
  "product": {
    "id": "product",
    "kind": "product",
    "name": "my-product",
    "title": "My Product",
    "version": "1.0.0",
    "modules": ["core", "billing"]
  },
  "modules": [...],
  "edges": [
    { "from": "core.entity.user", "to": "string", "kind": "field_type" }
  ],
  "metadata": {
    "compiler": "prodara-compiler@0.1.0",
    "compiled_at": "2026-03-18T12:00:00.000Z",
    "source_files": ["app.prd", "core.prd"]
  }
}
```

---

### `prodara plan [path]`

Compile and produce an incremental plan by comparing the current graph to the previous graph stored in `.prodara/`.

```bash
# JSON output (default)
prodara plan ./my-project

# Human-readable
prodara plan --format human ./my-project
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `human` or `json` | `json` |

**Exit codes:**
- `0` — Plan produced successfully
- `1` — Compilation errors

On first run (no previous graph), all nodes are classified as `added` and all tasks are `generate`.

**JSON output schema:**

```json
{
  "format": "prodara-plan",
  "version": "0.1.0",
  "changes": [
    { "nodeId": "core.entity.user", "changeKind": "added" }
  ],
  "impacts": [
    { "nodeId": "core.workflow.signup", "reason": "dependency changed", "via": "reads", "depth": 1 }
  ],
  "tasks": [
    { "taskId": "task-1", "action": "generate", "nodeId": "core.entity.user", "reason": "Node added" }
  ]
}
```

---

### `prodara diff [path]`

Produce an enriched incremental spec showing what changed between the current specification and the previous build state. Combines compilation, plan diffing, and node metadata enrichment.

```bash
# JSON output (default)
prodara diff ./my-project

# Human-readable
prodara diff --format human ./my-project
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `human` or `json` | `json` |

**Exit codes:**
- `0` — Diff produced successfully
- `1` — Compilation errors

**Human output example:**

```
Incremental Spec Summary
  Added:    2
  Removed:  0
  Modified: 1
  Impacted: 3
  Tasks:    6
  Modules:  core, billing
```

**JSON output:** An `IncrementalSpec` object with enriched `changes`, `impacts`, `tasks`, `summary`, and category `slices`.

---

### `prodara test [path]`

Run spec tests defined as `test` declarations within `.prd` files.

```bash
# Human-readable output (default, with ✓/✗ indicators)
prodara test ./my-project

# JSON output
prodara test --format json ./my-project
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | `human` or `json` | `human` |

**Exit codes:**
- `0` — All tests pass
- `1` — One or more tests failed, or compilation errors

**Human output example:**

```
Spec Tests
  ✓ task entity exists
  ✓ task has name field
  ✗ missing entity fails

Results: 2 passed, 1 failed, 3 total
```

**JSON output schema:**

```json
{
  "format": "prodara-test-results",
  "version": "0.1.0",
  "results": [
    { "name": "task entity exists", "passed": true, "target": "core.entity.task" },
    { "name": "missing entity fails", "passed": false, "target": "core.entity.missing", "message": "Node not found" }
  ],
  "summary": {
    "passed": 2,
    "failed": 1,
    "total": 3
  }
}
```

---

### `prodara doctor [path]`

Check compiler installation and workspace health.

```bash
prodara doctor ./my-project
```

**Output example:**

```
Prodara Doctor
  Compiler: prodara-compiler@0.1.0
  Node.js:  v20.11.0
  Path:     /Users/dev/my-project
  Files:    4 .prd files found
```

**Exit codes:**
- `0` — Always (informational only)

## stdout / stderr Discipline

| Stream | Content |
|--------|---------|
| **stdout** | Primary output: graph JSON, plan JSON, test results, doctor info |
| **stderr** | Diagnostics (errors/warnings), human-formatted validation output |

This separation ensures that agents can pipe stdout to files or parsers while still seeing diagnostics on stderr.

## Path Resolution

- If `[path]` is omitted, defaults to the current working directory (`.`)
- The compiler discovers `.prd` files recursively from the given path
- `.prodara/` build state is read from/written to the given path root
