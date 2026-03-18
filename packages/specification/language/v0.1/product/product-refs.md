# Prodara Language Specification v0.1
## Product References

Product references define **typed connections to other Prodara products**.

They allow one product to consume another product's public surfaces — its APIs, events, and shared domain types — in the same way that `integration` declarations model external services.

Product references are Prodara's mechanism for **product-to-product composition**.

---

# Purpose

Product references exist to:

- allow products to consume other products' APIs without duplicating definitions
- model inter-product dependencies explicitly in the specification
- enable type-safe cross-product communication
- make product boundaries and contracts visible in the Product Graph
- support monorepo and multi-repo multi-product architectures

---

# Relationship to Integrations

An `integration` models an **external service** (Stripe, SendGrid, Slack) — a system that is not a Prodara product and has no Product Graph.

A `product_ref` models **another Prodara product** — a system that has its own Product Graph, typed surfaces, entities, and events.

Because the referenced product is also a Prodara product, the compiler can validate cross-product references against the dependency's Product Graph rather than relying on loose protocol descriptions.

| Aspect              | `integration`              | `product_ref`                  |
|---------------------|----------------------------|--------------------------------|
| Target              | External service           | Another Prodara product        |
| Type safety         | Protocol-level only        | Full Product Graph validation  |
| Surfaces            | Not modeled                | Bound to specific surfaces     |
| Domain types        | Not shared                 | Shared via `exposes` contract  |
| Events              | Not typed                  | Typed from source Product Graph|
| Auth                | Secret-based               | Secret-based or platform-managed|

---

# Product Reference Declaration

Product references are declared using the `product_ref` keyword inside a module.

Example:

    module billing {

      product_ref identity_service {
        product: "@company/identity"
        version: "1.0"

        consumes {
          actors: [admin, accountant]
          entities: [user]
        }
      }

    }

This declares that the `billing` module depends on the `identity` product and consumes specific published constructs from it.

---

# Properties

A product reference may contain:

## product

The product identifier. Product identifiers use the same scoping convention as registry packages:

    product: "@company/identity"
    product: "shared_identity"

If the referenced product is in the same workspace (monorepo), a simple name suffices. For products in separate repositories, use an organization scope.

## version

The version constraint for the referenced product. Follows the same semver rules as registry packages:

    version: "1.0"
    version: "2.1.3"

## consumes

The `consumes` block declares which published constructs from the referenced product are being consumed. This is an explicit dependency contract.

    consumes {
      actors: [admin, accountant]
      entities: [user, organization]
      enums: [user_role]
      events: [user_created, user_deleted]
      surfaces: [user_api]
    }

The `consumes` block may contain any combination of:

| Key         | Description                                          |
|-------------|------------------------------------------------------|
| `actors`    | Actor definitions consumed from the other product    |
| `entities`  | Entity types consumed (read-only type references)    |
| `values`    | Value types consumed                                 |
| `enums`     | Enum types consumed                                  |
| `events`    | Events consumed (to trigger local workflows)         |
| `surfaces`  | Public API surfaces consumed (for calling)           |
| `tokens`    | Design tokens consumed (for visual consistency)      |
| `strings`   | Localized strings consumed                           |

## auth

Optional authentication configuration for inter-product communication:

    auth {
      api_key: identity_api_key
    }

References a secret, following the same pattern as `integration` auth blocks.

## description

Optional human-readable description:

    description: "Core identity and access management"

---

# Using Consumed Constructs

Once a `product_ref` is declared, consumed constructs become available in the module using a qualified path:

    module billing {

      product_ref identity_service {
        product: "identity"
        version: "1.0"
        consumes {
          actors: [admin]
          entities: [user]
          events: [user_created]
        }
      }

      entity invoice {
        invoice_id: uuid
        owner: identity_service.user
      }

      workflow reconcile_accounts {
        capability: account_management

        on: identity_service.user_created

        reads {
          identity_service.user
        }

        writes {
          invoice
        }

        returns {
          ok: invoice
          error: reconciliation_error
        }
      }

    }

The `identity_service.user` reference is resolved against the dependency's Product Graph. The compiler validates that:

- the referenced product publishes `user` as a consumable entity
- the field types of `user` are compatible with the usage context
- the `user_created` event exists and its payload type is accessible

---

# Publishing Constructs

For a product to be consumable by other products, it must declare which constructs it publishes. This is done in the product declaration:

    product identity {
      title: "Identity Service"
      version: "1.0.0"
      modules: [identity]

      publishes {
        actors: [admin, accountant]
        entities: [user, organization]
        enums: [user_role]
        events: [user_created, user_deleted]
        surfaces: [user_api]
      }
    }

The `publishes` block defines the product's **public contract**. Only published constructs can be consumed by other products. This enforces encapsulation: internal entities, workflows, and implementation details remain private.

If a product has no `publishes` block, it does not expose any constructs for cross-product consumption.

---

# Resolution

The compiler resolves product references using a **workspace manifest** at `.prodara/products.json`:

    {
      "format": "prodara-products",
      "version": "0.1.0",
      "products": {
        "identity": {
          "path": "../identity-service/",
          "graph": "../identity-service/.prodara/output/product.prd.graph.json"
        },
        "@company/shared_design": {
          "git": "https://github.com/company/shared-design.git",
          "branch": "main",
          "graph": ".prodara/output/product.prd.graph.json"
        }
      }
    }

## Resolution sources

| Source        | Description                                                   |
|--------------|---------------------------------------------------------------|
| Local path   | Relative filesystem path to another product workspace          |
| Git repository| Git URL with branch and graph path within the repository      |

The compiler reads only the **compiled Product Graph** of the dependency, not its source files. This enforces a clean dependency boundary: the consuming product depends on the compiled public contract, not on implementation details.

## Monorepo support

In a monorepo where multiple products share a single Git repository, local path resolution is sufficient:

    workspace/
      identity-service/
        app.prd
        .prodara/output/product.prd.graph.json
      billing-service/
        app.prd
        .prodara/products.json   ← references ../identity-service/

---

# Compiler Responsibilities

During compilation, the compiler must:

1. Parse all `product_ref` declarations.
2. Resolve each referenced product using `.prodara/products.json`.
3. Load the dependency's compiled Product Graph.
4. Validate that the dependency's `publishes` block contains every symbol listed in the `consumes` block.
5. Type-check all references to consumed constructs against the dependency's types.
6. Validate version compatibility between the declared constraint and the dependency's actual version.
7. Detect circular product dependencies and emit diagnostics.
8. Emit diagnostics for unresolvable products, missing published symbols, or type mismatches.

## Compilation order

In multi-product workspaces, the compiler must build products in dependency order (topological sort). A product cannot be compiled until all its product dependencies have been compiled and their Product Graphs are available.

---

# Product Graph Encoding

Product references become nodes in the Product Graph.

    {
      "id": "billing.product_ref.identity_service",
      "kind": "product_ref",
      "name": "identity_service",
      "product": "identity",
      "version": "1.0.0",
      "consumes": {
        "actors": ["identity.actor.admin"],
        "entities": ["identity.entity.user"],
        "events": ["identity.event.user_created"]
      },
      "auth": {
        "api_key": "platform.secret.identity_api_key"
      }
    }

## Edge kinds

| Kind                   | From          | To                     | Description                                  |
|------------------------|---------------|------------------------|----------------------------------------------|
| `product_dependency`   | product_ref   | (external product ID)  | References the dependency product             |
| `consumes_type`        | product_ref   | (external node ID)     | Consumes a type from the dependency           |
| `consumes_event`       | product_ref   | (external node ID)     | Consumes an event from the dependency         |
| `consumes_surface`     | product_ref   | (external node ID)     | Consumes a surface/API from the dependency    |

External node IDs use the format `@product_name.module.kind.name` to distinguish them from local nodes.

---

# Interaction with Other Constructs

## Workflows

Workflows can trigger on events from referenced products:

    on: identity_service.user_created

This generates an event listener / webhook handler for the external product's event.

## Entities

Consumed entity types can be used as field types:

    entity invoice {
      owner: identity_service.user
    }

The compiler generates corresponding type references. Since the entity is owned by the other product, the consuming product cannot create or modify instances — it receives them as read-only data.

## Surfaces

Consumed surfaces represent API endpoints the product can call:

    effects {
      notify identity_service.user_api
    }

The compiler generates client code for calling the referenced surface, similar to how integration clients work.

---

# Best Practices

- Publish the minimal set of constructs necessary. Over-publishing weakens encapsulation.
- Version published contracts carefully — breaking changes to published types affect all consumers.
- In monorepos, use local path resolution. In multi-repo setups, use Git resolution.
- Keep `product_ref` declarations in a dedicated module (e.g., `dependencies`) for clarity in large products.
- Use the `consumes` block to document exactly what the dependency contract is.

---

# Future Extensions

Future versions may add:

- cross-product workflow orchestration (product A calls a workflow in product B)
- cross-product testing (asserting behavior across product boundaries)
- product dependency graph visualization
- cross-product incremental compilation with shared caches

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `product_ref_decl`
- `language/v0.1/platform/integrations.md` — external service integrations (non-Prodara systems)
- `language/v0.1/core/imports.md` — intra-product module imports
- `language/v0.1/product/product.md` — product declaration and `publishes` block
- `model/product-graph.md` — Product Graph node types including product_ref
- `model/product-graph-format.md` — JSON encoding of product_ref nodes
