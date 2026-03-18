# Example: Multi-Module Enterprise Product

This example demonstrates a larger enterprise product specification. It exercises advanced features: **cross-module actor imports**, **state machine transitions**, **events**, **governance** (security, privacy, constitution), **runtime infrastructure** (secrets, environments, deployments), **cross-product references** (`product_ref`/`publishes`), and **spec-level testing**.

---

## What You'll Learn

| Concept                    | Construct                           | File          |
|---------------------------|-------------------------------------|---------------|
| Published API              | `publishes { ... }`                 | app.prd       |
| Shared actors via import   | `import admin from identity`        | billing.prd   |
| Events with payload        | `event invoice_issued`              | billing.prd   |
| State machine transitions  | `transitions { status: issued -> void }` | billing.prd |
| Selective authorization    | Only admin gets `invoice.void`      | billing.prd   |
| Security governance        | `security billing_surface_security` | billing.prd   |
| Privacy governance         | `privacy invoice_privacy`           | billing.prd   |
| Authorization test         | `test only_admin_can_void_invoice`  | billing.prd   |
| Cross-product reference    | `product_ref analytics_service`     | platform.prd  |
| Constitution + registry    | `constitution`, `use: [registry/...]`| platform.prd |
| Secrets and integrations   | `secret`, `integration`             | platform.prd  |
| Environment resolution     | `environment local` / `production`  | platform.prd  |
| Schedules                  | `schedule nightly_reconciliation`   | platform.prd  |
| Deployments                | `deployment web_app`                | platform.prd  |

---

## Product Structure

    product enterprise_suite {
      title: "Enterprise Suite"
      version: "0.1.0"
      modules: [identity, billing, design, platform]

      publishes {
        actors: [identity.admin, identity.accountant]
        entities: [billing.invoice]
        events: [billing.invoice_issued]
      }
    }

The `publishes` block controls what other products can consume via `product_ref`. Anything not listed is private.

- `identity` — actors shared across the product
- `billing` — invoicing domain, workflows, governance, tests
- `design` — visual tokens
- `platform` — constitution, integrations, runtime infrastructure

---

## Key Patterns

### Shared actors via import

Actors are defined once in the identity module and imported wherever needed:

    // identity.prd
    actor admin { title: "Administrator" }

    // billing.prd
    import admin from identity

### Selective authorization

Only admin can void invoices — accountant is deliberately excluded:

    authorization {
      admin: [invoice.void]
    }

### Governance

    security billing_surface_security {
      applies_to: [invoice_list, void_invoice]
      requires: [authentication, authorization, audit_logging]
    }

    privacy invoice_privacy {
      applies_to: [invoice]
      classification: business_sensitive
      retention: "7 years"
    }

### Spec-level test

Tests validate spec semantics without running generated code:

    test only_admin_can_void_invoice {
      target: void_invoice

      expect {
        authorization {
          admin: allowed
          accountant: denied
        }
      }
    }

### Cross-product reference

A `product_ref` declares a type-safe dependency on another Prodara product:

    product_ref analytics_service {
      product: "analytics"
      version: "2.0"

      consumes {
        events: [page_viewed, feature_used]
      }
    }

### Constitution and runtime

    constitution default_product {
      use: [
        registry/backend/nestjs@1.1,
        registry/database/postgres@2.0
      ]

      policies {
        security { authentication: required }
      }
    }

    environment local {
      secrets {
        stripe_api_key: env.STRIPE_API_KEY    // from env var
      }
    }

    environment production {
      secrets {
        stripe_api_key: vault.prod.stripe     // from vault
      }
    }

This example is suitable as a compiler integration test, a planning engine regression fixture, and a reference for enterprise product specification.
