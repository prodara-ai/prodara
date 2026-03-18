# Product Graph Format

The Product Graph is the canonical compiled semantic model produced by the Prodara compiler. It captures the full structure, relationships, and metadata of a product specification.

## Format Envelope

```json
{
  "format": "prodara-product-graph",
  "version": "0.1.0",
  "product": { ... },
  "modules": [ ... ],
  "edges": [ ... ],
  "metadata": { ... }
}
```

## Product Node

Every graph has exactly one product node:

```json
{
  "id": "product",
  "kind": "product",
  "name": "my-product",
  "title": "My Product",
  "version": "1.0.0",
  "modules": ["core", "billing"],
  "publishes": {
    "types": ["core.entity.user"],
    "events": ["core.event.user_created"]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `"product"` | Always `"product"` |
| `kind` | `"product"` | Always `"product"` |
| `name` | `string` | Product name from declaration |
| `title` | `string \| null` | Human-readable title |
| `version` | `string \| null` | Semantic version |
| `modules` | `string[]` | Module IDs |
| `publishes` | `Record<string, string[]> \| null` | Published categories and node IDs |

## Module Nodes

One module node per declared module:

```json
{
  "id": "core",
  "kind": "module",
  "name": "core",
  "imports": [
    { "symbol": "user", "from": "identity", "alias": null }
  ],
  "entities": [
    {
      "id": "core.entity.user",
      "kind": "entity",
      "name": "user",
      "fields": [
        { "name": "user_id", "type": "uuid" },
        { "name": "email", "type": "string" },
        { "name": "profile", "type": { "ref": "core.value.profile" } }
      ],
      "metadata": {}
    }
  ],
  "workflows": [ ... ],
  "surfaces": [ ... ]
}
```

## Node ID Format

All nodes use stable semantic IDs:

```
<module>.<kind>.<name>
```

Examples:
- `core.entity.user`
- `billing.workflow.checkout`
- `core.surface.dashboard`
- `product` (the product node is a special case)

## Type References

Types in the graph are represented as:

| Form | JSON | Example |
|------|------|---------|
| Primitive | `"string"` | `"string"`, `"integer"`, `"uuid"` |
| Reference | `{ "ref": "core.entity.user" }` | Reference to a declared type |
| Generic | `{ "generic": "optional", "arg": "string" }` | `optional<string>`, `list<integer>` |
| Nested generic | `{ "generic": "list", "arg": { "ref": "core.entity.item" } }` | `list<item>` |

## Edges

Edges encode all relationships between nodes:

```json
{ "from": "core.entity.user", "to": "string", "kind": "field_type" }
```

| Field | Type | Description |
|-------|------|-------------|
| `from` | `string` | Source node ID |
| `to` | `string` | Target node ID or primitive type name |
| `kind` | `EdgeKind` | Relationship type |

### Edge Kinds (40)

| Category | Edge Kinds |
|----------|------------|
| **Structure** | `contains`, `imports` |
| **Type** | `field_type`, `input_type`, `return_type`, `payload_type`, `contract_type` |
| **Data flow** | `reads`, `writes`, `uses_rule`, `calls` |
| **Events** | `transitions`, `triggers_on`, `emits`, `notifies` |
| **Invocation** | `invokes`, `binds`, `exposes_action` |
| **Surface** | `contains_surface`, `uses_serialization`, `targets_surface` |
| **Design** | `uses_token`, `extends_tokens`, `references_string` |
| **Refinement** | `refines_entity`, `refines_workflow`, `refines_surface` |
| **Extension** | `attaches_to` |
| **Governance** | `governs`, `binds_secret`, `uses_secret`, `includes_env` |
| **Authorization** | `authorized_as`, `member_of` |
| **Testing** | `tests` |
| **Product references** | `product_dependency`, `consumes_type`, `consumes_event`, `consumes_surface`, `consumes_actor` |

## Metadata

```json
{
  "compiler": "prodara-compiler@0.1.0",
  "compiled_at": "2026-03-18T12:00:00.000Z",
  "source_files": ["app.prd", "core.prd", "billing.prd"]
}
```

## Determinism

The graph is deterministic: the same input files always produce the same graph (except for the `compiled_at` timestamp). Module ordering, node ordering within modules, and edge ordering are all stable.
