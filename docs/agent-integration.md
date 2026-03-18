# Agent Integration Guide

This document describes how external AI coding agents can use the Prodara compiler. The CLI and output formats are designed for machine consumption from day one.

## Core Contract

Any agent that can invoke shell commands and parse JSON can drive the Prodara compiler. The integration contract is:

1. **Non-interactive** — No prompts, no interactive input, no TTY requirements
2. **Deterministic** — Same input always produces same output (except timestamps)
3. **Machine-readable** — All commands support `--format json`
4. **Clean exit codes** — `0` = success, `1` = errors
5. **stdout/stderr separation** — Data on stdout, diagnostics on stderr

## Recommended Workflow

The simplest agent-driven flow is a single `build` command:

```bash
# Full build with machine-readable summary
prodara build --format json ./project
echo $?  # 0 = success, 1 = errors
```

The build command runs the entire pipeline (validate → graph → plan → test) and returns a `BuildSummary` JSON object with status, file count, error/warning counts, test results, and task action breakdown.

For more granular control, agents can run individual phases:

```
validate → graph → plan → test
```

### Step 1: Validate

```bash
prodara validate --format json ./project
echo $?  # 0 = clean, 1 = errors
```

If exit code is `1`, parse the JSON diagnostics from stderr to understand and fix errors in the `.prd` files.

### Step 2: Build Graph

```bash
prodara graph --format json --output .prodara/graph.json ./project
```

The agent can parse the Product Graph JSON to understand the product model, inspect nodes and edges, and reason about the specification.

### Step 3: Produce Plan

```bash
prodara plan --format json ./project
```

The plan artifact describes what changed since the last build and what generation work is needed. Agents can use this to determine which files to generate or regenerate.

### Step 4: Run Tests

```bash
prodara test --format json ./project
echo $?  # 0 = all pass, 1 = failures
```

Parse the test results JSON to verify specification behavior.

## Machine-Readable Output Formats

### Diagnostics

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
      "column": 1,
      "endLine": 10,
      "endColumn": 1,
      "related": [],
      "fix": {
        "description": "Add opening brace",
        "suggestions": ["{"]
      }
    }
  ],
  "summary": {
    "errors": 1,
    "warnings": 0
  }
}
```

Key fields for agents:
- `severity` — `error`, `warning`, or `info`
- `file`, `line`, `column` — Exact location for automated fixes
- `code` — Stable diagnostic code (e.g., `PRD0010`)
- `fix.suggestions` — Machine-applicable fix suggestions when available

### Product Graph

```json
{
  "format": "prodara-product-graph",
  "version": "0.1.0",
  "product": {
    "id": "product",
    "kind": "product",
    "name": "my-app",
    "title": "My Application",
    "version": "1.0.0",
    "modules": ["core"]
  },
  "modules": [
    {
      "id": "core",
      "kind": "module",
      "name": "core",
      "imports": [],
      "entities": [...],
      "workflows": [...],
      "surfaces": [...]
    }
  ],
  "edges": [
    { "from": "core.entity.user", "to": "string", "kind": "field_type" },
    { "from": "core.workflow.signup", "to": "core.entity.user", "kind": "writes" }
  ],
  "metadata": {
    "compiler": "prodara-compiler@0.1.0",
    "compiled_at": "2026-03-18T12:00:00.000Z",
    "source_files": ["app.prd"]
  }
}
```

Node IDs follow the pattern `<module>.<kind>.<name>` (e.g., `core.entity.user`), providing stable references across compilations.

### Plan Artifact

```json
{
  "format": "prodara-plan",
  "version": "0.1.0",
  "changes": [
    { "nodeId": "core.entity.user", "changeKind": "structurally_changed", "details": "Fields modified" }
  ],
  "impacts": [
    { "nodeId": "core.workflow.signup", "reason": "dependency changed", "via": "writes", "depth": 1 }
  ],
  "tasks": [
    { "taskId": "task-1", "action": "regenerate", "nodeId": "core.entity.user", "reason": "Node structurally changed" },
    { "taskId": "task-2", "action": "verify", "nodeId": "core.workflow.signup", "reason": "Impacted by core.entity.user" }
  ]
}
```

Change kinds: `added`, `removed`, `renamed`, `structurally_changed`, `behaviorally_changed`, `policy_changed`

Task actions: `generate` (new), `regenerate` (changed), `remove` (deleted), `verify` (impacted, may need update)

### Test Results

```json
{
  "format": "prodara-test-results",
  "version": "0.1.0",
  "results": [
    { "name": "user entity exists", "passed": true, "target": "core.entity.user" },
    { "name": "admin authorized", "passed": true, "target": "core.workflow.manage" }
  ],
  "summary": {
    "passed": 2,
    "failed": 0,
    "total": 2
  }
}
```

## Iterative Compile/Fix Loop

Agents can drive an iterative loop:

```
1. Run: prodara validate --format json ./project
2. Parse JSON diagnostics
3. If errors:
   a. Read diagnostic locations (file, line, column)
   b. Apply fixes to .prd files
   c. Go to step 1
4. If clean:
   a. Run: prodara graph --format json ./project
   b. Run: prodara plan --format json ./project
   c. Use plan tasks to guide generation
```

The compiler is idempotent — running it multiple times on unchanged files produces identical output.

## Programmatic API Alternative

For agents that can execute Node.js directly (e.g., via a language server or MCP tool), the programmatic API provides the same capabilities:

```typescript
import { compile, serializeGraph, formatDiagnosticsJson } from '@prodara/compiler';

const result = compile('./project');

// Check for errors
if (result.diagnostics.hasErrors) {
  const json = formatDiagnosticsJson(result.diagnostics);
  // Parse and handle diagnostics
}

// Access the graph directly
if (result.graph) {
  const graphJson = serializeGraph(result.graph);
  // Use graph data
}
```

## Stable Behavior Guarantees

The compiler guarantees:

1. **Deterministic output** — Same `.prd` files → same graph, diagnostics, plan (except `compiled_at` timestamp)
2. **Stable node IDs** — Node IDs derived from module + kind + name, not file positions
3. **Stable diagnostic codes** — Diagnostic codes (e.g., `PRD0010`) are stable across compiler versions
4. **Backward-compatible formats** — Output format versions are semver. Non-breaking additions only within a minor version
5. **No side effects** — `validate`, `graph`, and `test` do not write any files. `build` and `plan` write to `.prodara/`
6. **Clean process model** — The compiler runs as a single process, exits cleanly, produces no background threads

## Agent Configuration Tips

- Always use `--format json` when parsing output programmatically
- Check exit codes before parsing output
- Use `--output` flag with `prodara graph` to write directly to a file for large graphs
- The `.prodara/` directory can be safely deleted to reset incremental state
- All paths are relative to the project root in diagnostics and graph output
