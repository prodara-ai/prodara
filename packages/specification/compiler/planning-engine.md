# Prodara Planning Engine

This document defines the planning engine used to translate the Product Graph into actionable implementation and regeneration plans.

The planning engine is one of Prodara's defining components. It is responsible for turning semantic product changes into deterministic generation work.

## Purpose

The planning engine exists to:

- compare specification states
- compute semantic diffs
- identify impacted graph regions
- classify required generation work
- avoid unnecessary regeneration

## Inputs

The planning engine consumes:

- current Product Graph (`.prd.graph.json` — see `model/product-graph-format.md`)
- previous Product Graph or graph snapshot
- constitution and policy context
- target platform configuration
- optional existing artifact manifest

## Outputs

The planning engine emits a plan containing:

- impacted modules
- impacted declarations
- affected artifact groups
- generation tasks
- validation tasks
- review/fix tasks
- plan diagnostics

## Planning modes

### Full planning

Used when no prior graph exists or a full rebuild is requested.

### Incremental planning

Used when a prior graph exists and only changed graph regions should be re-planned.

## Semantic diffing

The planning engine compares prior and current graph nodes using stable semantic IDs.

Changes may be classified as:

- added
- removed
- renamed
- structurally changed
- behaviorally changed
- policy-changed

## Impact propagation

The planner propagates change impact through graph edges.

Example propagation:

- entity change -> workflows reading/writing entity -> surfaces binding entity -> renderings targeting those surfaces

This propagation is essential for safe incremental generation.

## Task classes

The planner may emit tasks such as:

- rebuild Product Graph slice
- regenerate backend behavior
- regenerate surface implementation
- regenerate rendering output
- rerun spec tests
- rerun integration validation
- rerun review/fix loop

## Plan granularity

Plans should be graph-aware, not file-aware only.

A file change may or may not imply a broad generation impact. Planning should classify impact semantically.

## Constitution influence

Constitutions may influence planning by requiring:

- review/fix loops
- mandatory tests
- security validation
- style enforcement
- generator selection

## Persistence

The plan may be persisted as a machine-readable artifact so that local development and CI can share a consistent execution model.

## Failure behavior

If the planner cannot classify a change safely, it should fall back to a broader plan rather than risk under-generation.

## Recommended artifact

A plan artifact is a JSON document with the extension `.prd.plan.json`.

It should include:

- timestamp
- graph version
- changed node IDs
- impacted node IDs
- tasks
- required generators
- required validations

Example:

    {
      "format": "prodara-plan",
      "version": "0.1.0",
      "timestamp": "2026-03-18T10:00:00Z",
      "graph_hash": "sha256:abc123...",
      "previous_graph_hash": "sha256:def456...",
      "changes": [
        {
          "node": "billing.entity.invoice",
          "change": "structurally_changed",
          "fields_added": ["due_date"],
          "fields_removed": []
        }
      ],
      "impact": [
        "billing.workflow.create_invoice",
        "billing.surface.invoice_list",
        "billing.rule.invoice_total_positive"
      ],
      "tasks": [
        {
          "kind": "regenerate",
          "target": "billing.workflow.create_invoice",
          "reason": "input entity structurally changed"
        },
        {
          "kind": "revalidate",
          "target": "billing.rule.invoice_total_positive",
          "reason": "target entity structurally changed"
        }
      ]
    }

---

## See Also

- `model/product-graph-format.md` — Product Graph serialization format consumed by the planner
- `compiler/compiler-architecture.md` — compiler pipeline overview
- `compiler/build-state.md` — build baseline that provides the previous graph snapshot
- `compiler/graph-slicing.md` — graph slicing that consumes the plan
- `compiler/generation.md` — generation protocol that executes the plan
