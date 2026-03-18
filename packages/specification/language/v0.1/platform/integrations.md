# Prodara Language Specification v0.1
## Integrations

Integrations define **external systems or services** that the product interacts with.

They provide named references for workflows, effects, and transport/policy layers.

Examples:

stripe  
sendgrid  
salesforce  
slack  

---

# Purpose of Integrations

Integrations exist to:

• model external services  
• provide stable symbols for effects and workflows  
• centralize protocol and auth metadata  
• support planning and generation  

---

# Integration Declaration

Integrations are declared using the `integration` keyword.

Example:

integration stripe {

  title: "Stripe"

  kind: external_service

  protocol: http

  serialization: platform.default

}

---

# Integration Properties

An integration may contain:

title  
description  
kind  
protocol  
serialization  
auth  

---

# Auth Block

Integrations may define authentication requirements.

Example:

integration sendgrid {

  protocol: http

  auth {
    api_key: sendgrid_api_key
  }

}

Secrets are referenced symbolically.

---

# Workflow and Effect Usage

Integrations may be referenced in workflow effects or future workflow calls.

Example:

effects {
  notify sendgrid.send_email
}

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• integration names are unique  
• referenced secrets exist  
• referenced serialization policies exist  

Integrations become nodes in the **Product Graph**.

Edges connect them to:

• secrets  
• workflows  
• serialization policies

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `integration_decl`
- `model/product-graph.md` — Integration node type and edges
- `language/v0.1/runtime/secrets.md` — secrets referenced in auth blocks
- `language/v0.1/behavior/workflows.md` — workflows using integrations in effects
- `language/v0.1/product/product-refs.md` — for referencing other Prodara products (use `product_ref` instead of `integration` when the target is a Prodara product)