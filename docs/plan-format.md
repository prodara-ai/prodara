# Plan Artifact Format

The plan artifact describes what changed between two Product Graph versions and what generation work is needed. Plans are produced by `prodara plan` and stored in `.prodara/plan.json`.

## Format Envelope

```json
{
  "format": "prodara-plan",
  "version": "0.1.0",
  "changes": [ ... ],
  "impacts": [ ... ],
  "tasks": [ ... ]
}
```

## Changes

Each change describes a single node-level difference between the previous and current graph:

```json
{
  "nodeId": "core.entity.user",
  "changeKind": "structurally_changed",
  "details": "Fields modified"
}
```

### Change Kinds

| Kind | Description |
|------|-------------|
| `added` | Node exists in current graph but not previous |
| `removed` | Node exists in previous graph but not current |
| `renamed` | Node identity changed (rare) |
| `structurally_changed` | Node's edges or topology changed |
| `behaviorally_changed` | Node's properties changed without structural impact |
| `policy_changed` | Governance/security/privacy edges changed |

Classification logic:
1. If edge topology (from/to/kind triples) changed → `structurally_changed`
2. If governance edges changed → `policy_changed`
3. Otherwise → `behaviorally_changed`

## Impacts

Impact entries describe nodes transitively affected by changes:

```json
{
  "nodeId": "core.workflow.signup",
  "reason": "dependency changed",
  "via": "writes",
  "depth": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nodeId` | `string` | Impacted node ID |
| `reason` | `string` | Human-readable reason |
| `via` | `string` | Edge kind through which impact propagated |
| `depth` | `number` | Propagation depth from original change |

Impact propagation follows graph edges outward from changed nodes. The depth field indicates how many hops away the impacted node is from the original change.

## Tasks

Plan tasks are actionable work items for generators:

```json
{
  "taskId": "task-1",
  "action": "regenerate",
  "nodeId": "core.entity.user",
  "reason": "Node structurally changed"
}
```

### Task Actions

| Action | Description |
|--------|-------------|
| `generate` | Create new artifacts for a newly added node |
| `regenerate` | Update artifacts for a changed node |
| `remove` | Delete artifacts for a removed node |
| `verify` | Check artifacts for an impacted (but not directly changed) node |

## Initial Plan

On first compilation (no previous graph), the plan contains:
- All nodes as `added` changes
- No impacts (since all nodes are new)
- All tasks as `generate`

## Incremental Plan

On subsequent compilations, the plan compares the current graph to `.prodara/graph.json`:
1. Diff to find changed, added, and removed nodes
2. Classify each change
3. Propagate impact along graph edges
4. Generate tasks for all changes and impacts

## Build State

The plan is persisted alongside the graph in `.prodara/`:

```
.prodara/
├── build.json     # Build metadata (version, timestamps, hashes)
├── graph.json     # Current Product Graph
└── plan.json      # Current Plan
```

`build.json` format:

```json
{
  "version": "0.1.0",
  "lastCompiled": "2026-03-18T12:00:00.000Z",
  "sourceHash": "<sha256 of sorted source files>",
  "graphHash": "<sha256 of serialized graph>"
}
```
