# Prodara Language Specification v0.1
## Deployment

Deployment declarations define **how product environments are grouped and targeted for deployment**.

Deployments are part of the operational layer of Prodara, not the product semantics layer.

---

# Purpose of Deployment

Deployments exist to:

• group environments  
• define deployable application targets  
• connect the spec to operational workflows  
• support generated deployment artifacts  

---

# Deployment Declaration

Deployment is declared using the `deployment` keyword.

Example:

deployment web_app {

  environments: [
    local,
    staging,
    production
  ]

}

---

# Properties

A deployment may contain:

environments  
description  

---

# Environment References

The `environments` list identifies which environment declarations belong to the deployment target.

Example:

environments: [
  local,
  production
]

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• deployment names are unique  
• referenced environments exist  

Deployments become deployment/runtime nodes in the broader system model.

---

# Best Practices

Deployments should represent meaningful deployable targets.

Examples:

web_app  
backend_api  
worker_cluster  

They should not duplicate product semantics.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `deployment_decl`
- `model/product-graph.md` — Deployment node type and edges
- `language/v0.1/runtime/environments.md` — environments grouped by deployments