# Prodara Product Graph Format v0.1

This document defines the **concrete serialization format** of the Product Graph.

The Product Graph is the canonical intermediate representation (IR) that all `.prd` files compile into. Every downstream tool — planner, code generator, language server, validator — consumes this format.

This specification defines the format precisely enough that independently implemented compilers produce structurally identical output for the same input.

---

# Design Goals

The format must be:

- **Deterministic** — identical inputs produce byte-identical outputs
- **Human-readable** — developers can inspect and debug the graph directly
- **Machine-parseable** — tools consume it without ambiguity
- **Diffable** — incremental changes produce minimal, meaningful diffs
- **Self-contained** — a single graph file represents the complete compiled product

---

# Encoding

The Product Graph is serialized as a single JSON document.

- Character encoding: UTF-8
- No BOM
- No trailing newline required
- Canonical key ordering (alphabetical) at every level
- No duplicate keys
- 2-space indentation for human readability

File extension: `.prd.graph.json`

---

# Top-Level Structure

    {
      "format": "prodara-product-graph",
      "version": "0.1.0",
      "product": { ... },
      "modules": [ ... ],
      "edges": [ ... ],
      "metadata": { ... }
    }

## Fields

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| `format`   | string | yes      | Always `"prodara-product-graph"`               |
| `version`  | string | yes      | Graph format version (semver)                  |
| `product`  | object | yes      | Root product node                              |
| `modules`  | array  | yes      | All module nodes with their contained nodes    |
| `edges`    | array  | yes      | All semantic edges between nodes               |
| `metadata` | object | no       | Compiler info, timestamps, source file manifest|

---

# Node Identity

Every node has a stable, unique identity string.

Format:

    module_name.kind.declaration_name

Examples:

    billing.entity.invoice
    billing.workflow.create_invoice
    billing.enum.invoice_status
    design.tokens.base
    design.theme.dark
    platform.secret.stripe_api_key

The product root node has the identity:

    product

Module nodes have the identity:

    module_name

These identities are used in edge references, diagnostics, planning diffs, and code generation mapping. They must be stable across compilations of the same source.

---

# Product Node

    {
      "id": "product",
      "kind": "product",
      "name": "saas_billing",
      "title": "SaaS Billing",
      "version": "0.1.0",
      "modules": ["billing", "crm", "design", "platform"],
      "publishes": {
        "entities": ["billing.entity.invoice"],
        "events": ["billing.event.invoice_created"],
        "surfaces": ["billing.surface.invoice_api"]
      }
    }

The `publishes` object lists node IDs grouped by construct kind. If the product has no `publishes` block, this field is `null` or omitted.

---

# Module Node

Each module is an object containing its declarations grouped by kind.

    {
      "id": "billing",
      "kind": "module",
      "name": "billing",
      "imports": [
        {
          "symbol": "customer",
          "from": "crm",
          "alias": null
        }
      ],
      "actors": [ ... ],
      "capabilities": [ ... ],
      "entities": [ ... ],
      "values": [ ... ],
      "enums": [ ... ],
      "rules": [ ... ],
      "workflows": [ ... ],
      "actions": [ ... ],
      "events": [ ... ],
      "schedules": [ ... ],
      "surfaces": [ ... ],
      "renderings": [ ... ],
      "tokens": [ ... ],
      "themes": [ ... ],
      "strings": [ ... ],
      "serializations": [ ... ],
      "integrations": [ ... ],
      "transports": [ ... ],
      "storages": [ ... ],
      "executions": [ ... ],
      "extensions": [ ... ],
      "constitutions": [ ... ],
      "securities": [ ... ],
      "privacies": [ ... ],
      "validations": [ ... ],
      "secrets": [ ... ],
      "environments": [ ... ],
      "deployments": [ ... ],
      "tests": [ ... ],
      "product_refs": [ ... ]
    }

Empty arrays may be omitted from output.

---

# Node Schemas

Each declaration kind has a precise JSON schema. All nodes include `id`, `kind`, and `name` fields.

## Entity

    {
      "id": "billing.entity.invoice",
      "kind": "entity",
      "name": "invoice",
      "fields": [
        { "name": "invoice_id", "type": "uuid" },
        { "name": "customer", "type": { "ref": "crm.entity.customer" } },
        { "name": "total", "type": { "ref": "billing.value.money" } },
        { "name": "status", "type": { "ref": "billing.enum.invoice_status" } }
      ]
    }

### Field type encoding

Primitive types are encoded as strings: `"string"`, `"integer"`, `"decimal"`, `"boolean"`, `"uuid"`, `"date"`, `"datetime"`.

References to other declarations use `{ "ref": "node_id" }`.

Generic types use `{ "generic": "optional", "arg": "string" }` or `{ "generic": "list", "arg": { "ref": "billing.entity.invoice" } }`.

## Value

    {
      "id": "billing.value.money",
      "kind": "value",
      "name": "money",
      "fields": [
        { "name": "amount", "type": "decimal" },
        { "name": "currency", "type": "string" }
      ]
    }

## Enum

    {
      "id": "billing.enum.invoice_status",
      "kind": "enum",
      "name": "invoice_status",
      "members": [
        { "name": "draft" },
        { "name": "issued" },
        { "name": "paid" }
      ]
    }

Enum members with metadata include a `metadata` object:

    { "name": "cancelled", "metadata": { "label": "Cancelled" } }

## Rule

    {
      "id": "billing.rule.invoice_total_positive",
      "kind": "rule",
      "name": "invoice_total_positive",
      "entity": "billing.entity.invoice",
      "condition": {
        "op": ">",
        "left": { "access": ["total", "amount"] },
        "right": { "literal": 0, "type": "integer" }
      },
      "message": "billing.strings.ui_strings.invoice_total_positive"
    }

### Expression encoding

Expressions are encoded as an AST in JSON:

| Expression form     | JSON encoding                                                              |
|---------------------|---------------------------------------------------------------------------|
| Field access        | `{ "access": ["field", "nested"] }`                                       |
| String literal      | `{ "literal": "value", "type": "string" }`                               |
| Number literal      | `{ "literal": 42, "type": "integer" }` or `"type": "decimal"`            |
| Boolean literal     | `{ "literal": true, "type": "boolean" }`                                  |
| Enum value          | `{ "literal": "draft", "type": "identifier" }`                           |
| Comparison          | `{ "op": "==", "left": expr, "right": expr }`                            |
| And                 | `{ "op": "and", "operands": [expr, expr, ...] }`                         |
| Or                  | `{ "op": "or", "operands": [expr, expr, ...] }`                          |
| Not                 | `{ "op": "not", "operand": expr }`                                        |
| Parenthesized       | No special encoding — precedence is structural in the AST                 |

Compound example for `total.amount > 0 and status == draft`:

    {
      "op": "and",
      "operands": [
        {
          "op": ">",
          "left": { "access": ["total", "amount"] },
          "right": { "literal": 0, "type": "integer" }
        },
        {
          "op": "==",
          "left": { "access": ["status"] },
          "right": { "literal": "draft", "type": "identifier" }
        }
      ]
    }

## Actor

    {
      "id": "billing.actor.accountant",
      "kind": "actor",
      "name": "accountant",
      "title": "Accountant",
      "description": null
    }

## Capability

    {
      "id": "billing.capability.invoicing",
      "kind": "capability",
      "name": "invoicing",
      "title": "Invoicing",
      "description": null,
      "actors": ["billing.actor.accountant", "billing.actor.admin"]
    }

## Workflow

    {
      "id": "billing.workflow.create_invoice",
      "kind": "workflow",
      "name": "create_invoice",
      "capability": "billing.capability.invoicing",
      "authorization": [
        {
          "actor": "billing.actor.accountant",
          "permissions": ["invoice.create"]
        }
      ],
      "input": [
        { "name": "customer", "type": { "ref": "crm.entity.customer" } },
        { "name": "due_date", "type": "date" }
      ],
      "reads": ["crm.entity.customer"],
      "writes": ["billing.entity.invoice"],
      "rules": ["billing.rule.invoice_total_positive"],
      "steps": [
        { "kind": "call", "target": "billing.workflow.validate_customer" },
        {
          "kind": "decide",
          "name": "customer_valid",
          "branches": [
            { "when": "yes", "action": { "kind": "call", "target": "billing.workflow.calculate_total" } },
            { "when": "no", "action": { "kind": "fail", "code": "invalid_customer" } }
          ]
        }
      ],
      "transitions": [
        {
          "entity": "billing.entity.invoice",
          "field": "status",
          "from": "draft",
          "to": "issued"
        }
      ],
      "effects": [
        { "kind": "audit", "message": "Invoice created" },
        { "kind": "notify", "target": "notifications.integration.send_email" },
        { "kind": "emit", "event": "billing.event.invoice_created" }
      ],
      "returns": [
        { "name": "ok", "type": { "ref": "billing.entity.invoice" } },
        { "name": "error", "type": { "ref": "billing.enum.invoice_error" } }
      ],
      "trigger": null
    }

## Action

    {
      "id": "billing.action.create_invoice",
      "kind": "action",
      "name": "create_invoice",
      "title": "Create Invoice",
      "workflow": "billing.workflow.create_invoice"
    }

## Event

    {
      "id": "billing.event.invoice_created",
      "kind": "event",
      "name": "invoice_created",
      "payload": { "ref": "billing.entity.invoice" },
      "description": null
    }

## Schedule

    {
      "id": "platform.schedule.nightly_reconciliation",
      "kind": "schedule",
      "name": "nightly_reconciliation",
      "cron": "0 2 * * *",
      "description": null
    }

## Surface

    {
      "id": "billing.surface.invoice_list",
      "kind": "surface",
      "name": "invoice_list",
      "surface_kind": "view",
      "title": "billing.strings.ui_strings.invoice_list_title",
      "description": null,
      "capability": "billing.capability.invoicing",
      "binds": "billing.entity.invoice",
      "serialization": null,
      "surfaces": [],
      "actions": ["billing.action.create_invoice"],
      "rules": [],
      "hooks": [],
      "fields": []
    }

## Rendering

    {
      "id": "design.rendering.invoice_list_web",
      "kind": "rendering",
      "name": "invoice_list_web",
      "target": "billing.surface.invoice_list",
      "platform": "web",
      "layout": "grid",
      "grid": {
        "columns": [{ "value": 1, "unit": "fr" }, { "value": 2, "unit": "fr" }],
        "rows": ["auto"],
        "gap": 16
      },
      "placements": [
        { "name": "header", "row": 1, "column": { "from": 1, "to": 2 } },
        { "name": "content", "row": 2, "column": 1 }
      ],
      "styles": {},
      "bindings": {},
      "components": [],
      "responsive": []
    }

## Token Set

    {
      "id": "design.tokens.base",
      "kind": "tokens",
      "name": "base",
      "categories": {
        "color": {
          "brand_primary": "#2E6BFF",
          "surface_background": "#FFFFFF"
        },
        "spacing": {
          "md": 12,
          "lg": 16
        }
      }
    }

## Theme

    {
      "id": "design.theme.dark",
      "kind": "theme",
      "name": "dark",
      "extends": "design.tokens.base",
      "overrides": {
        "color": {
          "surface_background": "#111827"
        }
      }
    }

## Strings

    {
      "id": "billing.strings.ui_strings",
      "kind": "strings",
      "name": "ui_strings",
      "entries": {
        "invoice_list_title": "Invoices",
        "invoice_total_positive": "Invoice total must be positive"
      }
    }

## Serialization

    {
      "id": "platform.serialization.default",
      "kind": "serialization",
      "name": "default",
      "properties": {
        "format": "json",
        "naming": "snake_case",
        "dates": "iso8601"
      }
    }

## Integration

    {
      "id": "platform.integration.stripe",
      "kind": "integration",
      "name": "stripe",
      "title": null,
      "integration_kind": null,
      "protocol": "http",
      "serialization": null,
      "auth": {
        "api_key": "platform.secret.stripe_api_key"
      }
    }

## Transport

    {
      "id": "platform.transport.billing_api",
      "kind": "transport",
      "name": "billing_api",
      "target": "billing.surface.invoice_list",
      "protocol": "http",
      "style": "rest"
    }

## Storage

    {
      "id": "platform.storage.invoice_store",
      "kind": "storage",
      "name": "invoice_store",
      "target": "billing.entity.invoice",
      "model": "relational",
      "table": "invoices",
      "indexes": [
        { "fields": ["customer_id"], "unique": false },
        { "fields": ["invoice_id"], "unique": true }
      ]
    }

## Execution

    {
      "id": "platform.execution.create_invoice_async",
      "kind": "execution",
      "name": "create_invoice_async",
      "target": "billing.workflow.create_invoice",
      "mode": "async"
    }

## Extension

    {
      "id": "platform.extension.payment_gateway",
      "kind": "extension",
      "name": "payment_gateway",
      "target": "billing.workflow.process_payment",
      "extension_kind": "hook",
      "contract": {
        "input": { "ref": "billing.value.money" },
        "output": { "ref": "billing.value.payment_result" }
      }
    }

## Constitution

    {
      "id": "platform.constitution.default_product",
      "kind": "constitution",
      "name": "default_product",
      "description": null,
      "applies_to": [],
      "packages": [
        { "path": "registry/backend/nestjs", "version": "1.1" },
        { "path": "registry/database/postgres", "version": "2.0" }
      ],
      "policies": {
        "security": {
          "authentication": "required",
          "authorization": "required"
        },
        "testing": {
          "tests_required": true
        }
      }
    }

## Security

    {
      "id": "billing.security.billing_surface_security",
      "kind": "security",
      "name": "billing_surface_security",
      "applies_to": [
        "billing.surface.invoice_list",
        "billing.workflow.void_invoice"
      ],
      "requires": ["authentication", "authorization", "audit_logging"]
    }

## Privacy

    {
      "id": "billing.privacy.invoice_privacy",
      "kind": "privacy",
      "name": "invoice_privacy",
      "applies_to": ["billing.entity.invoice"],
      "classification": "business_sensitive",
      "retention": "7 years",
      "redact_on": [],
      "exportable": false,
      "erasable": false
    }

## Validation

    {
      "id": "billing.validation.billing_validation",
      "kind": "validation",
      "name": "billing_validation",
      "applies_to": ["billing"],
      "requires": ["schema_validation"]
    }

## Secret

    {
      "id": "platform.secret.stripe_api_key",
      "kind": "secret",
      "name": "stripe_api_key",
      "description": null,
      "source": "vault",
      "env": null,
      "path": null,
      "scope": []
    }

## Environment

    {
      "id": "platform.environment.production",
      "kind": "environment",
      "name": "production",
      "url": null,
      "description": null,
      "secrets": {
        "stripe_api_key": "vault.prod.stripe"
      },
      "integrations": {}
    }

## Deployment

    {
      "id": "platform.deployment.web_app",
      "kind": "deployment",
      "name": "web_app",
      "description": null,
      "environments": [
        "platform.environment.local",
        "platform.environment.production"
      ]
    }

## Test

    {
      "id": "billing.test.only_admin_can_void_invoice",
      "kind": "test",
      "name": "only_admin_can_void_invoice",
      "target": "billing.workflow.void_invoice",
      "description": null,
      "given": {},
      "expect": {
        "authorization": {
          "admin": "allowed",
          "accountant": "denied"
        }
      }
    }

## Product Reference

    {
      "id": "billing.product_ref.identity_service",
      "kind": "product_ref",
      "name": "identity_service",
      "product": "identity",
      "version": "1.0.0",
      "description": "Core identity and access management",
      "consumes": {
        "actors": ["@identity.identity.actor.admin"],
        "entities": ["@identity.identity.entity.user"],
        "events": ["@identity.identity.event.user_created"]
      },
      "auth": {
        "api_key": "platform.secret.identity_api_key"
      }
    }

Consumed node IDs use the `@product_name` prefix to distinguish external nodes from local ones. The prefix matches the product identifier in the `product` field.

---

# Edges

Edges are encoded as an array of objects. Each edge has a `kind`, `from` node ID, `to` node ID, and optional attributes.

    {
      "kind": "contains",
      "from": "billing",
      "to": "billing.entity.invoice"
    }

## Edge schema

    {
      "kind": string,
      "from": string,
      "to": string,
      "attributes": object | null
    }

## Edge kinds

The complete set of edge kinds in v0.1:

### Structural
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `contains`         | product/module | module/node    | Structural containment              |
| `imports`          | module         | module         | Module dependency via import        |

### Type reference
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `field_type`       | entity/value   | type node      | Field references a type             |
| `input_type`       | workflow       | type node      | Workflow input field type           |
| `return_type`      | workflow       | type node      | Workflow return type                |
| `payload_type`     | event          | type node      | Event payload type                  |
| `contract_type`    | extension      | type node      | Extension contract input/output     |

### Data dependency
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `reads`            | workflow       | entity         | Workflow reads entity               |
| `writes`           | workflow       | entity         | Workflow writes entity              |
| `uses_rule`        | workflow       | rule           | Workflow applies rule               |
| `calls`            | workflow       | workflow       | Workflow calls nested workflow      |
| `transitions`      | workflow       | entity         | Workflow transitions entity field   |

### Behavior
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `triggers_on`      | workflow       | event/schedule | Workflow triggered by event/schedule|
| `emits`            | workflow       | event          | Workflow emits event                |
| `notifies`         | workflow       | integration    | Workflow notifies integration       |
| `invokes`          | action         | workflow       | Action invokes workflow             |

### Interaction
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `binds`            | surface        | entity         | Surface binds entity data           |
| `exposes_action`   | surface        | action         | Surface exposes action              |
| `contains_surface` | surface        | surface        | Surface contains nested surface     |
| `uses_serialization`| surface       | serialization  | Surface uses serialization policy   |
| `targets_surface`  | rendering      | surface        | Rendering targets surface           |
| `uses_token`       | rendering      | tokens         | Rendering references token          |

### Design
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `extends_tokens`   | theme          | tokens         | Theme extends token set             |
| `references_string`| surface/rule/wf| strings        | Construct references string key     |

### Platform
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `refines_entity`   | storage        | entity         | Storage refines entity              |
| `refines_workflow` | execution      | workflow       | Execution refines workflow          |
| `refines_surface`  | transport      | surface        | Transport refines surface           |
| `attaches_to`      | extension      | workflow/node  | Extension attaches to construct     |
| `uses_secret`      | integration    | secret         | Integration references secret       |
| `uses_serialization`| integration   | serialization  | Integration uses serialization      |

### Governance
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `governs`          | security/privacy/validation/constitution | any | Governance construct applies to target |

### Runtime
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `binds_secret`     | environment    | secret         | Environment binds secret value      |
| `includes_env`     | deployment     | environment    | Deployment includes environment     |

### Testing
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `tests`            | test           | any            | Test targets a construct            |

### Authorization
| Kind               | From           | To             | Description                         |
|--------------------|----------------|----------------|-------------------------------------|
| `authorized_as`    | actor          | workflow       | Actor is authorized on workflow     |
| `member_of`        | actor          | capability     | Actor is member of capability       |

### Cross-product
| Kind               | From           | To              | Description                                    |
|--------------------|----------------|-----------------|------------------------------------------------|
| `product_dependency`| product_ref   | (external ID)   | References a dependency product                |
| `consumes_type`    | product_ref    | (external ID)   | Consumes a type (entity/value/enum) from dependency |
| `consumes_event`   | product_ref    | (external ID)   | Consumes an event from the dependency          |
| `consumes_surface` | product_ref    | (external ID)   | Consumes a surface/API from the dependency     |
| `consumes_actor`   | product_ref    | (external ID)   | Consumes an actor from the dependency          |

External node IDs use the format `@product_name.module.kind.name`.

---

# Edge Attributes

Some edges carry attributes for additional semantic information.

## Transition edges

    {
      "kind": "transitions",
      "from": "billing.workflow.void_invoice",
      "to": "billing.entity.invoice",
      "attributes": {
        "field": "status",
        "from_value": "issued",
        "to_value": "void"
      }
    }

## Authorization edges

    {
      "kind": "authorized_as",
      "from": "billing.actor.admin",
      "to": "billing.workflow.void_invoice",
      "attributes": {
        "permissions": ["invoice.void"]
      }
    }

## Field type edges

    {
      "kind": "field_type",
      "from": "billing.entity.invoice",
      "to": "billing.enum.invoice_status",
      "attributes": {
        "field": "status"
      }
    }

## String reference edges

    {
      "kind": "references_string",
      "from": "billing.surface.invoice_list",
      "to": "billing.strings.ui_strings",
      "attributes": {
        "key": "invoice_list_title"
      }
    }

## Cross-product edges

    {
      "kind": "consumes_type",
      "from": "billing.product_ref.identity_service",
      "to": "@identity.identity.entity.user",
      "attributes": {
        "product": "identity",
        "version": "1.0.0"
      }
    }

    {
      "kind": "consumes_event",
      "from": "billing.product_ref.identity_service",
      "to": "@identity.identity.event.user_created",
      "attributes": {
        "product": "identity",
        "version": "1.0.0"
      }
    }

---

# Metadata

The `metadata` object is optional and carries compiler and build information.

    {
      "compiler": "prodara-compiler",
      "compiler_version": "0.1.0",
      "compiled_at": "2026-03-18T10:00:00Z",
      "source_files": [
        "app.prd",
        "billing.prd",
        "crm.prd",
        "design.prd",
        "platform.prd"
      ],
      "source_hash": "sha256:abc123..."
    }

The `source_hash` is a deterministic hash of all source file contents. It allows downstream tools to verify that the graph matches the source.

---

# Ordering Rules

To ensure deterministic output:

1. Top-level keys appear in the order: `format`, `version`, `product`, `modules`, `edges`, `metadata`
2. Modules are ordered alphabetically by name
3. Within each module, declaration arrays are ordered alphabetically by name
4. Edges are ordered by: `kind` (alphabetical), then `from` (alphabetical), then `to` (alphabetical)
5. All object keys are ordered alphabetically at every nesting level

These rules ensure that identical specifications produce byte-identical graph output.

---

# Null Handling

- Absent optional properties: omit the key entirely
- Explicitly null-valued properties: include with `null` value only when the property is structurally required (e.g., `trigger: null` on workflows to distinguish action-triggered from event-triggered)

---

# Validation

A well-formed Product Graph must satisfy:

1. All `from` and `to` values in edges resolve to declared node IDs
2. All `ref` values in type encodings resolve to declared node IDs
3. The product node lists exactly the modules present in the `modules` array
4. No duplicate node IDs exist
5. No duplicate edges exist (same kind + from + to + attributes)
6. The graph is acyclic for containment edges
7. All nodes are reachable from the product root through containment edges

---

# Usage in the Compiler Pipeline

The Product Graph format is consumed at these pipeline stages:

| Stage            | Reads                | Writes               |
|------------------|----------------------|----------------------|
| Parser           | .prd source files    | AST (internal)       |
| Semantic Analyzer| AST                  | Product Graph (.prd.graph.json) |
| Validator        | Product Graph        | Diagnostics          |
| Planner          | Product Graph (old + new) | Plan (diff)     |
| Generator        | Product Graph + Plan | Generated code       |
| Test Runner      | Product Graph        | Test results         |
| Language Server  | Product Graph        | Completions, diagnostics |

The Product Graph is the **single source of truth** after compilation. No downstream tool should need to reparse `.prd` source files.

---

# Complete Example

A minimal but complete Product Graph for a single-entity todo app:

    {
      "format": "prodara-product-graph",
      "version": "0.1.0",
      "product": {
        "id": "product",
        "kind": "product",
        "name": "todo_app",
        "title": "Todo App",
        "version": "0.1.0",
        "modules": ["todo"]
      },
      "modules": [
        {
          "id": "todo",
          "kind": "module",
          "name": "todo",
          "imports": [],
          "entities": [
            {
              "id": "todo.entity.task",
              "kind": "entity",
              "name": "task",
              "fields": [
                { "name": "task_id", "type": "uuid" },
                { "name": "title", "type": "string" },
                { "name": "done", "type": "boolean" }
              ]
            }
          ],
          "actors": [
            {
              "id": "todo.actor.user",
              "kind": "actor",
              "name": "user",
              "title": "User",
              "description": null
            }
          ],
          "capabilities": [
            {
              "id": "todo.capability.task_management",
              "kind": "capability",
              "name": "task_management",
              "title": "Task Management",
              "description": null,
              "actors": ["todo.actor.user"]
            }
          ],
          "enums": [
            {
              "id": "todo.enum.task_error",
              "kind": "enum",
              "name": "task_error",
              "members": [
                { "name": "invalid_title" },
                { "name": "creation_failed" }
              ]
            }
          ],
          "workflows": [
            {
              "id": "todo.workflow.create_task",
              "kind": "workflow",
              "name": "create_task",
              "capability": "todo.capability.task_management",
              "authorization": [
                {
                  "actor": "todo.actor.user",
                  "permissions": ["task.create"]
                }
              ],
              "input": [],
              "reads": [],
              "writes": ["todo.entity.task"],
              "rules": [],
              "steps": [],
              "transitions": [],
              "effects": [],
              "returns": [
                { "name": "ok", "type": { "ref": "todo.entity.task" } },
                { "name": "error", "type": { "ref": "todo.enum.task_error" } }
              ],
              "trigger": null
            }
          ],
          "actions": [
            {
              "id": "todo.action.create_task",
              "kind": "action",
              "name": "create_task",
              "title": null,
              "workflow": "todo.workflow.create_task"
            }
          ],
          "strings": [
            {
              "id": "todo.strings.ui_strings",
              "kind": "strings",
              "name": "ui_strings",
              "entries": {
                "task_list_title": "Tasks"
              }
            }
          ],
          "surfaces": [
            {
              "id": "todo.surface.task_list",
              "kind": "surface",
              "name": "task_list",
              "surface_kind": "view",
              "title": "todo.strings.ui_strings.task_list_title",
              "description": null,
              "binds": "todo.entity.task",
              "actions": ["todo.action.create_task"],
              "rules": [],
              "surfaces": [],
              "hooks": [],
              "fields": []
            }
          ]
        }
      ],
      "edges": [
        { "kind": "authorized_as", "from": "todo.actor.user", "to": "todo.workflow.create_task", "attributes": { "permissions": ["task.create"] } },
        { "kind": "binds", "from": "todo.surface.task_list", "to": "todo.entity.task" },
        { "kind": "contains", "from": "product", "to": "todo" },
        { "kind": "contains", "from": "todo", "to": "todo.action.create_task" },
        { "kind": "contains", "from": "todo", "to": "todo.actor.user" },
        { "kind": "contains", "from": "todo", "to": "todo.capability.task_management" },
        { "kind": "contains", "from": "todo", "to": "todo.entity.task" },
        { "kind": "contains", "from": "todo", "to": "todo.enum.task_error" },
        { "kind": "contains", "from": "todo", "to": "todo.strings.ui_strings" },
        { "kind": "contains", "from": "todo", "to": "todo.surface.task_list" },
        { "kind": "contains", "from": "todo", "to": "todo.workflow.create_task" },
        { "kind": "exposes_action", "from": "todo.surface.task_list", "to": "todo.action.create_task" },
        { "kind": "invokes", "from": "todo.action.create_task", "to": "todo.workflow.create_task" },
        { "kind": "member_of", "from": "todo.actor.user", "to": "todo.capability.task_management" },
        { "kind": "references_string", "from": "todo.surface.task_list", "to": "todo.strings.ui_strings", "attributes": { "key": "task_list_title" } },
        { "kind": "return_type", "from": "todo.workflow.create_task", "to": "todo.entity.task", "attributes": { "branch": "ok" } },
        { "kind": "return_type", "from": "todo.workflow.create_task", "to": "todo.enum.task_error", "attributes": { "branch": "error" } },
        { "kind": "writes", "from": "todo.workflow.create_task", "to": "todo.entity.task" }
      ],
      "metadata": {
        "compiler": "prodara-compiler",
        "compiler_version": "0.1.0",
        "compiled_at": "2026-03-18T10:00:00Z",
        "source_files": ["app.prd", "todo.behavior.prd", "todo.entities.prd", "todo.surfaces.prd"],
        "source_hash": "sha256:example"
      }
    }

---

# See Also

- `model/product-graph.md` — conceptual model and node/edge semantics
- `compiler/compiler-architecture.md` — compiler pipeline stages
- `compiler/planning-engine.md` — planning engine that diffs Product Graphs
