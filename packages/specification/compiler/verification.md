# Prodara Verification

This document defines the post-generation verification phase that determines whether a build is accepted or rejected.

Verification is the final gate before build outputs are persisted as the new baseline.

---

# Purpose

Verification exists to:

- ensure generated artifacts are internally consistent
- confirm that all required tests pass
- validate that constitution policies are satisfied
- guarantee that the artifact set matches the plan
- produce a definitive accept/reject decision

---

# Verification Checks

Verification runs the following checks in order. A build is rejected if any required check fails.

## 1. Artifact Completeness

Verify that every task in the plan produced at least one artifact.

- Compare the plan's task list against the artifact manifest
- Every `regenerate` task must have corresponding artifact entries
- Every `revalidate` task must have a validation result

Failure emits: `PRD0901` — Missing artifact for planned task

## 2. Artifact Consistency

Verify that generated artifacts reference valid graph nodes.

- Every `node_id` in the artifact manifest must exist in the current Product Graph
- No artifact references a deleted or renamed node without a corresponding manifest update

Failure emits: `PRD0902` — Artifact references nonexistent graph node

## 3. Extension Seam Integrity

Verify that all declared extensions have valid seams in generated artifacts.

- Every `extension` node in the Product Graph must have at least one corresponding seam entry in the artifact manifest
- Seam markers in generated files must be correctly paired
- Extension contract types must still be valid against the current graph

Failure emits: `PRD0903` — Extension seam missing or invalid

## 4. Spec Test Results

Verify that all authored and synthesized spec tests pass.

- Run spec tests (see `compiler/spec-testing.md`)
- All tests must pass unless explicitly skipped by constitution policy

Failure emits: `PRD0800`–`PRD0899` — Test failure diagnostics

## 5. Constitution Policy Satisfaction

Verify that all constitution-required policies are met.

| Policy Requirement           | Check                                                   |
|------------------------------|---------------------------------------------------------|
| `authentication: required`   | All surfaces and workflows have security governance     |
| `authorization: required`    | All workflows with capabilities have authorization blocks|
| `tests_required: true`       | Every workflow has at least one spec test                |
| `require_compile_check: true`| Generated code compiled successfully during review/fix  |
| `require_lint: true`         | Generated code passed linting during review/fix         |

Failure emits: `PRD0904` — Constitution policy not satisfied

## 6. Graph-Artifact Alignment

Verify that the generated artifact set aligns with the Product Graph.

- Every entity with a `storage` refinement has a corresponding schema artifact
- Every surface with a `transport` refinement has a corresponding API contract artifact
- Every workflow has an implementation artifact

This check ensures that no graph node was accidentally skipped during generation.

Failure emits: `PRD0905` — Graph node has no generated artifact

---

# Verification Result

Verification produces a result object:

    {
      "format": "prodara-verification",
      "version": "0.1.0",
      "timestamp": "2026-03-18T10:05:00Z",
      "status": "accepted",
      "checks": [
        { "name": "artifact_completeness", "status": "passed" },
        { "name": "artifact_consistency", "status": "passed" },
        { "name": "extension_seam_integrity", "status": "passed" },
        { "name": "spec_tests", "status": "passed", "passed": 12, "failed": 0 },
        { "name": "constitution_policies", "status": "passed" },
        { "name": "graph_artifact_alignment", "status": "passed" }
      ],
      "diagnostics": []
    }

If any check fails:

    {
      "status": "rejected",
      "checks": [
        { "name": "spec_tests", "status": "failed", "passed": 10, "failed": 2 }
      ],
      "diagnostics": [ ... ]
    }

## Fields

| Field          | Type   | Required | Description                                    |
|----------------|--------|----------|------------------------------------------------|
| `format`       | string | yes      | Always `"prodara-verification"`                |
| `version`      | string | yes      | Verification format version (semver)           |
| `timestamp`    | string | yes      | ISO 8601 timestamp                             |
| `status`       | string | yes      | `"accepted"` or `"rejected"`                   |
| `checks`       | array  | yes      | Results of individual verification checks      |
| `diagnostics`  | array  | yes      | Diagnostics from failed checks                 |

---

# Verification in the Pipeline

Verification runs after generation and the review/fix loop.

    ... → Generation → Review/Fix Loop → Verification → Emit Build Outputs

If verification rejects the build:

- Build outputs are not persisted as the new baseline
- `.prodara/build.json` is written with `"status": "failed"`
- All diagnostics are emitted
- The previous baseline remains intact for the next run

---

# Verification Diagnostic Codes

| Code     | Check                     | Description                                    |
|----------|---------------------------|------------------------------------------------|
| PRD0900  | (reserved)                | General verification error                     |
| PRD0901  | artifact_completeness     | Missing artifact for planned task              |
| PRD0902  | artifact_consistency      | Artifact references nonexistent graph node     |
| PRD0903  | extension_seam_integrity  | Extension seam missing or invalid              |
| PRD0904  | constitution_policies     | Constitution policy not satisfied              |
| PRD0905  | graph_artifact_alignment  | Graph node has no generated artifact           |

These codes live in the PRD0900–0999 range alongside warnings and lint, since verification is a post-generation concern.

---

## See Also

- `compiler/generation.md` — generation protocol and review/fix loop
- `compiler/build-state.md` — build baseline and artifact manifest
- `compiler/spec-testing.md` — spec test execution
- `compiler/diagnostics.md` — diagnostic format and codes
