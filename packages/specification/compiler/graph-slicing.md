# Prodara Graph Slicing

This document defines how the Product Graph is sliced into focused subgraphs for generation.

Graph slicing is the mechanism that makes generation targeted and efficient. Instead of passing the entire Product Graph to every generator, the compiler extracts the relevant subset.

---

# Purpose

Graph slicing exists to:

- give each generator only the nodes and edges it needs
- enable parallel generation across independent slices
- ensure incremental generation works at graph granularity, not file granularity
- reduce generator complexity by narrowing scope

---

# What Is a Graph Slice

A graph slice is a subset of the Product Graph that contains:

- a set of root nodes (the nodes targeted for generation)
- all transitive dependencies of those root nodes
- all edges between included nodes
- the product and module context necessary for code generation
- the constitution and policy context that governs the generation

A slice is a valid Product Graph subset. It uses the same node and edge schemas defined in `model/product-graph-format.md`.

---

# Slice Format

A graph slice is serialized as a JSON document that follows the Product Graph format but includes only the selected nodes and edges.

    {
      "format": "prodara-graph-slice",
      "version": "0.1.0",
      "slice_kind": "backend",
      "root_nodes": ["billing.workflow.create_invoice"],
      "product": { ... },
      "modules": [ ... ],
      "edges": [ ... ],
      "constitution": { ... },
      "metadata": { ... }
    }

### Additional Fields

| Field          | Type   | Required | Description                                             |
|----------------|--------|----------|---------------------------------------------------------|
| `slice_kind`   | string | yes      | Slice category (see below)                              |
| `root_nodes`   | array  | yes      | Node IDs targeted by this slice                         |
| `constitution` | object | yes      | Effective policies and registry package context         |

---

# Slice Categories

Slices are categorized by the type of generation they target.

| Category    | Root Node Kinds                        | Typical Generator Output                    |
|-------------|----------------------------------------|---------------------------------------------|
| `backend`   | workflow, entity, rule, event          | Services, repositories, domain logic        |
| `frontend`  | surface, rendering, tokens, theme      | Components, pages, styles                   |
| `api`       | surface, transport, serialization      | API routes, contracts, schemas              |
| `runtime`   | environment, secret, deployment        | Config files, deployment manifests          |
| `schema`    | entity, storage                        | Database schemas, migrations                |
| `test`      | test, workflow, entity                 | Generated test suites                       |

Implementations may define additional categories. The category determines which registry package (AGENTS.md / SKILL.md) handles the slice.

---

# Slice Computation

The compiler computes slices after planning and before generation.

## Input

- Current Product Graph
- Incremental plan (impacted node IDs and tasks)
- Constitution policies and registry package assignments

## Algorithm

1. Group plan tasks by slice category based on the node kind of each task target
2. For each category, collect the root nodes (task targets)
3. For each root node, walk outward through edges to collect transitive dependencies:
   - entity → fields → referenced types, rules, storage
   - workflow → reads, writes, rules, transitions, effects, called workflows, authorization, capability actors
   - surface → binds, actions, nested surfaces, serialization
   - rendering → target surface, tokens, theme
4. Include all edges where both endpoints are in the node set
5. Include the product node and the modules that own included nodes
6. Include the effective constitution (merged policies from all applicable constitutions and registry packages)

## Dependency Depth

Slice computation should follow dependencies transitively but stop at slice category boundaries.

For example, a `backend` slice includes a workflow and its entities but does not include the surface that references the workflow. The `frontend` slice handles that surface.

Cross-category references are preserved as unresolved node ID strings, allowing the generator to produce correct interface types without needing the full dependency graph.

---

# Overlap Between Slices

Nodes may appear in multiple slices. For example, an entity appears in both the `backend` and `schema` slices.

This is expected and safe because:

- each generator produces different artifacts from the same node
- the artifact manifest tracks which generator owns which output file
- there is no conflict because artifact kinds differ

---

# Constitution in Slices

Each slice includes the effective constitution context:

    "constitution": {
      "packages": [
        { "path": "registry/backend/nestjs", "version": "1.1" }
      ],
      "policies": {
        "security": { "authentication": "required" },
        "testing": { "tests_required": true }
      }
    }

Only the policies and packages relevant to the slice category are included.

---

# Full Build vs Incremental Build

### Full build

All nodes are included in slices. Every category gets a complete slice.

### Incremental build

Only nodes identified as impacted by the plan are included as root nodes. Dependencies are still resolved transitively to ensure completeness.

---

# Slice Validation

Before dispatching a slice to a generator, the compiler validates:

1. All root nodes exist in the Product Graph
2. All transitive dependencies are resolvable
3. The constitution includes at least one registry package for the slice category
4. No circular dependencies exist within the slice that would prevent ordered generation

If validation fails, the compiler emits a `planning_error` diagnostic and rejects the build.

---

## See Also

- `model/product-graph-format.md` — base graph format used by slices
- `compiler/planning-engine.md` — plan that drives slice computation
- `compiler/generation.md` — generation protocol that consumes slices
- `compiler/build-state.md` — artifact manifest tracking slice outputs
