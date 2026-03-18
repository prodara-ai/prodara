# Prodara Generation

This document defines how the Prodara compiler coordinates code generation from the Product Graph, including the generation protocol, extension seam preservation, and the review/fix loop.

---

# Purpose

The generation system exists to:

- translate Product Graph slices into implementation artifacts
- coordinate AI agent workflows using AGENTS.md and SKILL.md instructions
- preserve handwritten code in extension seams during regeneration
- run automated review/fix loops for quality assurance
- produce incremental, safe, deterministic outputs

---

# Generation Protocol

## Overview

The compiler does not generate code directly. It coordinates generators — AI agents or deterministic code emitters — by dispatching graph slices with context.

The protocol follows this sequence:

1. Compiler computes graph slices (see `compiler/graph-slicing.md`)
2. For each slice, compiler loads the appropriate AGENTS.md and SKILL.md from registry packages
3. Compiler loads the current artifact manifest to identify extension seams and existing artifacts
4. Compiler dispatches the slice, instructions, and context to the generator
5. Generator produces or updates artifacts
6. Compiler validates returned artifacts
7. If review/fix loop is enabled, compiler runs the quality loop
8. Compiler updates the artifact manifest

## Generator Input

Each generator invocation receives:

    {
      "slice": { ... },
      "instructions": {
        "agent": "contents of AGENTS.md",
        "skills": {
          "entity": "contents of entity.SKILL.md",
          "workflow": "contents of workflow.SKILL.md"
        }
      },
      "existing_artifacts": [
        {
          "path": "src/billing/invoice.service.ts",
          "content_hash": "sha256:abc123...",
          "seams": [ ... ]
        }
      ],
      "constitution": { ... }
    }

### Input Fields

| Field                 | Type   | Required | Description                                           |
|-----------------------|--------|----------|-------------------------------------------------------|
| `slice`               | object | yes      | Graph slice for this generation task                  |
| `instructions`        | object | yes      | AGENTS.md content and relevant SKILL.md files         |
| `existing_artifacts`  | array  | no       | Current artifacts for incremental update              |
| `constitution`        | object | yes      | Effective policies governing this generation          |

## Generator Output

Each generator returns:

    {
      "artifacts": [
        {
          "path": "src/billing/invoice.service.ts",
          "content": "...",
          "node_id": "billing.workflow.create_invoice",
          "kind": "implementation",
          "seams": [ ... ]
        }
      ],
      "diagnostics": [ ... ]
    }

### Output Fields

| Field          | Type   | Required | Description                                           |
|----------------|--------|----------|-------------------------------------------------------|
| `artifacts`    | array  | yes      | Generated or updated files                            |
| `diagnostics`  | array  | no       | Warnings or issues from generation                    |

---

# Extension Seam Preservation

Extensions define explicit boundaries where handwritten code may exist inside generated files. During regeneration, the compiler must preserve these seams.

## Seam Detection

Extension seams are identified by:

1. The `extension` declaration in the spec (defines the contract)
2. The `seams` array in the artifact manifest (records location in generated files)
3. Marker comments in generated files that delimit seam boundaries

### Marker Format

Generated files must use marker comments to delimit extension seams:

    // --- PRODARA SEAM START: payment_gateway (platform.extension.payment_gateway) ---
    // Custom implementation goes here
    // --- PRODARA SEAM END: payment_gateway ---

The exact comment syntax varies by target language but must include:

- the extension name
- the extension node ID
- clear start and end delimiters

## Preservation During Regeneration

When regenerating a file that contains extension seams:

1. Read the existing file content
2. Extract all seam regions (content between SEAM START and SEAM END markers)
3. Generate the new file content with empty seam placeholders
4. Reinsert the preserved seam content into the new markers
5. Update the artifact manifest with new line numbers

## Seam Validation

After preservation, the compiler validates:

- All declared extensions have corresponding seams in generated files
- Seam markers are correctly paired (every START has an END)
- Seam content is syntactically valid (does not break the file's parse)
- Extension contracts are still satisfied (input/output types match)

If a seam cannot be preserved (e.g., the surrounding generated code changed structure), the compiler emits a `generation_warning` diagnostic and writes the seam content to a backup file at `.prodara/seams/<extension_name>.backup`.

---

# Review/Fix Loop

When a constitution enables `review_fix_loop: true`, the compiler runs an automated quality loop after initial generation.

## Loop Steps

1. **Compile check** — Verify generated code compiles in the target language/framework
2. **Lint** — Run configured linters against generated artifacts
3. **Static analysis** — Run configured static analysis tools
4. **Generated test execution** — Run generated test suites
5. **AI review** — Submit artifacts for automated review against SKILL.md quality criteria
6. **Fix** — If any step fails, attempt automated repair

## Loop Configuration

The constitution controls the review/fix loop through the `testing` policy block:

    policies {
      testing {
        review_fix_loop: true
        max_fix_iterations: 3
        require_compile_check: true
        require_lint: true
        require_tests: true
      }
    }

### Policy Fields

| Field                    | Type    | Default | Description                                    |
|--------------------------|---------|---------|------------------------------------------------|
| `review_fix_loop`        | boolean | false   | Enable the review/fix loop                     |
| `max_fix_iterations`     | integer | 3       | Maximum number of fix attempts before failing  |
| `require_compile_check`  | boolean | true    | Generated code must compile                    |
| `require_lint`           | boolean | false   | Generated code must pass linting               |
| `require_tests`          | boolean | true    | Generated tests must pass                      |

## Loop Behavior

The loop runs sequentially:

    for iteration in 1..max_fix_iterations:
      issues = run_checks(artifacts)
      if no issues:
        accept
      else:
        artifacts = attempt_fix(artifacts, issues, instructions)

    if issues remain after max iterations:
      emit generation_error diagnostics
      reject build

The `attempt_fix` step passes the failing artifacts, the diagnostic details, and the original SKILL.md instructions back to the generator for repair.

## Loop Diagnostics

Each iteration emits diagnostics tagged with `phase: "review_fix"` and the iteration number:

    {
      "phase": "review_fix",
      "category": "generation_warning",
      "severity": "warning",
      "message": "Fix iteration 2: resolved 3 of 5 lint issues",
      "iteration": 2
    }

---

# Incremental Generation

Incremental generation updates only the artifacts affected by the current plan.

## What Stays Untouched

An artifact is skipped if:

- Its source node is not in the impacted set
- Its content hash in the artifact manifest matches the current state
- No transitive dependency of its source node has changed

## What Gets Regenerated

An artifact is regenerated if:

- Its source node is in the impacted set
- Any transitive dependency of its source node has changed
- The constitution or registry package version has changed

## What Gets Deleted

An artifact is deleted if:

- Its source node no longer exists in the current Product Graph
- The node's kind changed in a way that invalidates the artifact

Deletion is recorded in the artifact manifest by removing the entry.

---

# Full Regeneration

A full regeneration is triggered when:

- No previous build state exists
- The `--full` flag is passed
- The compiler version changed and is incompatible
- The constitution changed in a way that affects all generation

During full regeneration, extension seams are still preserved. The compiler reads existing files from disk, extracts seams, and reinserts them into freshly generated output.

---

# Generation Diagnostics

Generation may produce diagnostics in these categories:

| Category               | Severity | Description                                        |
|------------------------|----------|----------------------------------------------------|
| `generation_error`     | error    | Generation failed, artifact not produced           |
| `generation_warning`   | warning  | Generation succeeded with issues                   |
| `seam_warning`         | warning  | Extension seam could not be cleanly preserved      |
| `review_fix_error`     | error    | Review/fix loop exhausted without resolution       |
| `review_fix_warning`   | warning  | Review/fix loop resolved issues with caveats       |

---

## See Also

- `compiler/graph-slicing.md` — how the Product Graph is sliced for generators
- `compiler/build-state.md` — artifact manifest and build baseline
- `compiler/verification.md` — post-generation verification
- `compiler/planning-engine.md` — plan that drives generation tasks
- `registry/registry.md` — AGENTS.md and SKILL.md format
- `language/v0.1/platform/extensions.md` — extension declaration syntax
