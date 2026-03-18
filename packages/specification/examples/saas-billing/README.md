# Example: SaaS Billing Product

This example demonstrates a realistic multi-module SaaS billing product. It exercises **cross-module imports**, **domain modeling with value objects**, **validation rules with compound conditions**, **workflows with authorization, input, transitions, and effects**, **localized strings**, **design tokens and themes**, and **serialization**.

---

## What You'll Learn

| Concept                  | Construct                          | File         |
|--------------------------|------------------------------------|--------------|
| Cross-module imports     | `import customer from crm`         | billing.prd  |
| Value objects            | `value money`                      | billing.prd  |
| Compound rule conditions | `total.amount > 0 and status == draft` | billing.prd |
| Workflow input block     | `input { customer: ... }`          | billing.prd  |
| State transitions        | `transitions { invoice.status: ... }` | billing.prd |
| Audit effects            | `effects { audit "..." }`          | billing.prd  |
| Localized strings        | `strings invoice_strings`          | billing.prd  |
| Surface with string ref  | `title: billing.invoice_strings...`| billing.prd  |
| Surface hooks            | `hooks { load: ... }`              | billing.prd  |
| Design tokens + themes   | `tokens base`, `theme dark`        | design.prd   |
| Serialization policy     | `serialization default`            | platform.prd |

---

## Product Structure

    product saas_billing {
      title: "SaaS Billing"
      version: "0.1.0"
      modules: [crm, billing, design, platform]
    }

- `crm` — customer data
- `billing` — invoicing domain, behavior, and localization
- `design` — visual tokens and themes
- `platform` — serialization

---

## Key Patterns

### Cross-module imports

The billing module imports `customer` from crm instead of redefining it:

    import customer from crm

    entity invoice {
      customer: customer           // references crm.customer
    }

### Value objects

Value types are immutable and have no identity:

    value money {
      amount: decimal
      currency: string
    }

### Rules with compound conditions

    rule invoice_total_positive {
      entity: invoice
      condition: total.amount > 0 and status == draft
      message: billing.invoice_strings.total_must_be_positive
    }

### Workflow with input, transitions, and effects

    workflow create_invoice {
      authorization {
        accountant: [invoice.create]
        admin: [invoice.create]
      }

      input {
        customer: customer
        amount: money
      }

      transitions {
        invoice.status: draft -> issued
      }

      effects {
        audit "Invoice created"
      }

      returns {
        ok: invoice
        error: invoice_error
      }
    }

### Localized strings referenced by surfaces

    strings invoice_strings {
      invoice_list_title: "Invoices"
    }

    surface invoice_list {
      title: billing.invoice_strings.invoice_list_title
    }

### Design tokens and dark theme

    tokens base {
      color: {
        brand_primary: "#2E6BFF"
        surface_background: "#FFFFFF"
      }
    }

    theme dark {
      extends: base
      color: {
        surface_background: "#111827"
      }
    }

This example is suitable for parser testing, Product Graph verification, and as a reference for building real SaaS products.
