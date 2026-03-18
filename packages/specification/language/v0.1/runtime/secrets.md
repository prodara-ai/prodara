# Prodara Language Specification v0.1
## Secrets

Secrets define **sensitive runtime values** required by integrations or deployments.

Secrets are referenced symbolically in the specification but are not stored as plain values in the product spec.

This keeps the specification safe for Git and compatible with secret vault systems.

---

# Purpose of Secrets

Secrets exist to:

• model API keys and credentials safely  
• support vault and environment resolution  
• enable secure generation and deployment  
• make secret requirements analyzable  

---

# Secret Declaration

Secrets are declared using the `secret` keyword.

Example:

secret stripe_api_key {

  description: "Stripe API key"

  source: vault

}

Example using environment variable sourcing:

secret sendgrid_api_key {

  source: env

  env: "SENDGRID_API_KEY"

}

---

# Properties

A secret may contain:

description  
source  
env  
path  
scope  

---

# Source

The `source` property defines where the secret should be resolved from.

Examples:

vault  
env  
aws_secrets_manager  
gcp_secret_manager  
azure_keyvault  

---

# Env

The `env` property names the environment variable when `source: env` is used.

Example:

env: "SENDGRID_API_KEY"

---

# Scope

The optional `scope` property limits intended environments.

Example:

scope: [
  staging,
  production
]

---

# Usage

Secrets are referenced by integrations, deployments, or environments.

Example:

integration stripe {

  auth {
    api_key: stripe_api_key
  }

}

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• secret names are unique  
• source values are valid syntactically  
• referenced secrets exist where used  

Secrets become runtime configuration nodes in the Product Graph or adjacent runtime model.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `secret_decl`
- `model/product-graph.md` — Secret node type and edges
- `language/v0.1/runtime/environments.md` — environment-specific secret overrides
- `language/v0.1/platform/integrations.md` — integrations referencing secrets in auth blocks
