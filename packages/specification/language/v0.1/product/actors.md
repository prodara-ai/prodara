# Prodara Language Specification v0.1
## Actors

Actors define named execution principals that participate in capabilities, workflow authorization, surface access expectations, and policy interpretation.

Actors are optional in very small products but strongly recommended for any product that uses authorization or capability actor lists.

## Purpose of Actors

Actors exist to:

- provide stable names for principals
- support workflow authorization
- support capability ownership and audience descriptions
- support surface visibility and policy reasoning

Examples of actors:

admin
accountant
customer
support_agent
system

## Actor Declaration

Actors are declared using the `actor` keyword.

Example:

    actor accountant {

      title: "Accountant"

      description: "Internal finance operator"

    }

## Properties

An actor may contain:

- title
- description

## Cross-Module Actors

Actors defined in one module may be imported and used in other modules via the standard `import` mechanism.

Example:

    module identity {
      actor admin {
        title: "Administrator"
        description: "Full system access"
      }

      actor accountant {
        title: "Accountant"
        description: "Finance operator"
      }
    }

    module billing {
      import admin from identity
      import accountant from identity

      capability invoicing {
        actors: [accountant, admin]
      }

      workflow create_invoice {
        authorization {
          accountant: [invoice.create]
          admin: [invoice.create, invoice.void]
        }
      }
    }

Actors do not need to be redefined in every module. A product should define each actor once and import it where needed.

The compiler resolves actor references through the same import and symbol resolution rules that apply to all other constructs.

---

## Usage

Actors may be referenced by:

- workflow authorization blocks
- capabilities
- future surface visibility rules
- governance policies

Example:

    capability invoicing {
      actors: [
        accountant,
        admin
      ]
    }

Example:

    authorization {
      accountant: [invoice.create]
      admin: [invoice.create, invoice.void]
    }

## Compiler Responsibilities

During compilation, the compiler verifies:

- actor names are unique within the module
- referenced actors exist when actor declarations are present
- actor references resolve deterministically

Actors become nodes in the Product Graph.

## Identity Provider Mapping

In v0.1, actors are symbolic names only. They carry no runtime binding to external identity systems.

Future versions will connect actors to identity providers, role mappings, and group memberships. This will allow the compiler and generated code to enforce authorization against real identity infrastructure (e.g., OIDC claims, RBAC roles, directory groups).

Design actors now with this future connection in mind: each actor should correspond to a role or group that a real identity system would recognise.

---

## Best Practices

Actors should represent real execution principals, not implementation details.

Good examples:

- admin
- accountant
- customer
- system

Poor examples:

- api_layer
- db_user

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `actor_decl`
- `model/product-graph.md` — Actor node type and edges
- `language/v0.1/behavior/workflows.md` — authorization referencing actors
- `language/v0.1/product/capabilities.md` — capability actor lists
