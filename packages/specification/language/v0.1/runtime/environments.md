# Prodara Language Specification v0.1
## Environments

Environments define **named runtime contexts** for a product.

Examples:

local  
dev  
staging  
production  

Environments allow the same product specification to be deployed with different secrets, integration endpoints, and operational settings.

---

# Purpose of Environments

Environments exist to:

• separate runtime contexts  
• bind secrets differently per environment  
• support deployment pipelines  
• keep product semantics environment-neutral  

---

# Environment Declaration

Environments are declared using the `environment` keyword.

Example:

environment local {

  url: "http://localhost:3000"

}

Example with secret overrides:

environment production {

  secrets {
    stripe_api_key: vault.prod.stripe
  }

}

---

# Properties

An environment may contain:

url  
description  
secrets  
integrations  

---

# Secret Overrides

The `secrets` block binds symbolic secrets to environment-specific sources.

Example:

secrets {
  stripe_api_key: vault.prod.stripe
}

---

# Integration Overrides

The `integrations` block allows environment-specific overrides.

Example:

integrations {
  stripe.endpoint: "https://api.stripe.com"
}

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• environment names are unique  
• referenced secrets exist  
• referenced integrations exist  

Environment declarations become runtime/environment nodes in the broader system model.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `environment_decl`
- `model/product-graph.md` — Environment node type and edges
- `language/v0.1/runtime/secrets.md` — secrets bound to environments
- `language/v0.1/runtime/deployments.md` — deployment grouping of environments