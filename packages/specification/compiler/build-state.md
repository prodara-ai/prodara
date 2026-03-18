# Prodara Build State

This document defines the structure and format of the persisted build state that enables incremental compilation.

The build state is the baseline that the compiler loads before each compilation to determine what changed and what must be regenerated.

---

# Purpose

The build state exists to:

- enable incremental compilation (diff current graph against previous graph)
- track which artifacts were generated and from which graph nodes
- avoid full regeneration when only part of the spec changed
- provide a verifiable record of the last successful build

---

# Build State Directory

All build state lives in a `.prodara/` directory at the product workspace root.

    .prodara/
      build.json
      graph.json
      plan.json
      artifacts.json
      products.json
      registry/

## Files

| File               | Purpose                                                  |
|--------------------|----------------------------------------------------------|
| `build.json`       | Build metadata and status of the last successful build   |
| `graph.json`       | Snapshot of the Product Graph from the last successful build |
| `plan.json`        | Snapshot of the plan from the last successful build      |
| `artifacts.json`   | Artifact manifest mapping graph nodes to generated files |
| `products.json`    | Resolved product references for `product_ref` declarations |
| `registry/`        | Locally vendored registry packages                       |

All files use UTF-8 encoding and follow the same deterministic ordering rules as the Product Graph format.

The `.prodara/` directory should be committed to version control, except for `registry/` which may be `.gitignore`d if packages are fetched on demand.

---

# Build Metadata

File: `.prodara/build.json`

    {
      "format": "prodara-build",
      "version": "0.1.0",
      "status": "success",
      "timestamp": "2026-03-18T10:00:00Z",
      "compiler_version": "0.1.0",
      "source_hash": "sha256:abc123...",
      "graph_hash": "sha256:def456...",
      "plan_hash": "sha256:789abc...",
      "artifact_count": 42,
      "diagnostics_summary": {
        "errors": 0,
        "warnings": 3,
        "info": 1
      }
    }

## Fields

| Field               | Type   | Required | Description                                              |
|---------------------|--------|----------|----------------------------------------------------------|
| `format`            | string | yes      | Always `"prodara-build"`                                 |
| `version`           | string | yes      | Build state format version (semver)                      |
| `status`            | string | yes      | `"success"` or `"failed"`                                |
| `timestamp`         | string | yes      | ISO 8601 timestamp of the build                          |
| `compiler_version`  | string | yes      | Version of the compiler that produced the build          |
| `source_hash`       | string | yes      | Deterministic hash of all `.prd` source files            |
| `graph_hash`        | string | yes      | Hash of the `.prodara/graph.json` file                   |
| `plan_hash`         | string | no       | Hash of the `.prodara/plan.json` file                    |
| `artifact_count`    | integer| no       | Total number of generated artifacts                      |
| `diagnostics_summary`| object| no       | Count of diagnostics by severity                         |

---

# Graph Snapshot

File: `.prodara/graph.json`

This is a standard Product Graph file as defined in `model/product-graph-format.md`.

It represents the compiled Product Graph from the last successful build.

The planner loads this file to compute semantic diffs against the current compilation.

---

# Plan Snapshot

File: `.prodara/plan.json`

This is a standard plan artifact as defined in `compiler/planning-engine.md`.

It represents the plan that was executed during the last successful build.

Storing the plan enables tooling to inspect what was done without recomputing it.

---

# Artifact Manifest

File: `.prodara/artifacts.json`

The artifact manifest records every generated file, which graph node produced it, and its content hash.

    {
      "format": "prodara-artifacts",
      "version": "0.1.0",
      "timestamp": "2026-03-18T10:00:00Z",
      "artifacts": [ ... ]
    }

## Artifact Entry

Each artifact is an object:

    {
      "path": "src/billing/invoice.service.ts",
      "node_id": "billing.workflow.create_invoice",
      "generator": "registry/backend/nestjs@1.1",
      "kind": "implementation",
      "content_hash": "sha256:abc123...",
      "seams": [
        {
          "name": "payment_gateway",
          "extension_id": "platform.extension.payment_gateway",
          "start_line": 45,
          "end_line": 62
        }
      ]
    }

### Artifact Fields

| Field          | Type    | Required | Description                                              |
|----------------|---------|----------|----------------------------------------------------------|
| `path`         | string  | yes      | Repository-relative path to the generated file           |
| `node_id`      | string  | yes      | Product Graph node ID that produced this artifact        |
| `generator`    | string  | yes      | Registry package that generated this artifact            |
| `kind`         | string  | yes      | Artifact kind (see below)                                |
| `content_hash` | string  | yes      | Hash of the file contents at generation time             |
| `seams`        | array   | no       | Extension seam regions within the file (see below)       |

### Artifact Kinds

| Kind               | Description                                           |
|--------------------|-------------------------------------------------------|
| `implementation`   | Source code (service, controller, component)           |
| `schema`           | Database schema, API schema, GraphQL schema           |
| `contract`         | API contract (OpenAPI, protobuf)                      |
| `test`             | Generated test file                                   |
| `config`           | Runtime configuration file                            |
| `manifest`         | Deployment manifest, package.json, Dockerfile         |
| `documentation`    | Generated documentation                               |
| `migration`        | Database migration script                             |

### Seam Entry

Extension seam entries track where handwritten code lives inside generated files.

| Field          | Type    | Required | Description                                              |
|----------------|---------|----------|----------------------------------------------------------|
| `name`         | string  | yes      | Extension name                                           |
| `extension_id` | string  | yes      | Product Graph node ID of the extension declaration       |
| `start_line`   | integer | yes      | 1-based start line of the seam region                    |
| `end_line`     | integer | yes      | 1-based end line of the seam region                      |

---

# Incremental Build Flow

When the compiler starts an incremental build, it follows this sequence:

1. Read `.prodara/build.json` to confirm a previous successful build exists
2. Read `.prodara/graph.json` as the baseline Product Graph
3. Compile the current spec into a new Product Graph
4. Diff current graph against baseline graph (see `compiler/planning-engine.md`)
5. Build an incremental plan
6. Read `.prodara/artifacts.json` to determine which files are affected
7. Generate only artifacts affected by the plan
8. Write updated `.prodara/build.json`, `graph.json`, `plan.json`, and `artifacts.json`

If `.prodara/build.json` does not exist or has `"status": "failed"`, the compiler performs a full build.

---

# Staleness Detection

The compiler detects stale build state by comparing:

- `source_hash` in `build.json` against the current source file set
- `compiler_version` in `build.json` against the running compiler version

If either has changed, the planner may widen its diff strategy. A compiler version change may force a full rebuild if breaking changes are known.

---

# Failure Behavior

If a build fails:

- `.prodara/build.json` is written with `"status": "failed"`
- `.prodara/graph.json` is NOT updated (preserves last good baseline)
- `.prodara/plan.json` may be written for diagnostic inspection
- `.prodara/artifacts.json` is NOT updated

This ensures the next build can still diff against the last successful state.

---

## See Also

- `model/product-graph-format.md` — Product Graph serialization format
- `compiler/planning-engine.md` — plan format and semantic diffing
- `compiler/compilation-phases.md` — compilation pipeline
- `compiler/generation.md` — generation protocol and artifact output
