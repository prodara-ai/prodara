# language/v0.1/product.md

# Prodara Language Specification v0.1
## Product

The `product` declaration defines the **root identity of a Prodara specification workspace**.

All modules belong conceptually to a product.  
The product declaration gives the compiler, tooling, and documentation systems a single canonical entry point.

The product declaration does **not** replace modules.  
Modules remain the primary organizational and semantic boundaries of the language.

---

# Purpose of Product

The product declaration exists to define:

• product identity  
• human-readable metadata  
• workspace-level defaults  
• the canonical set of modules  

It enables:

• deterministic workspace loading  
• documentation generation  
• CI and validation entry points  
• future versioning and packaging  

---

# Product Declaration

A product is declared using the `product` keyword.

Example:

product prodara {

  title: "Prodara"

  version: "0.1.0"

  modules: [
    auth,
    billing,
    crm,
    design,
    platform
  ]

}

Only one product declaration may exist per workspace in v0.1.

---

# Product Properties

A product may contain the following properties:

title  
version  
description  
modules  

Not all are required, but `modules` is strongly recommended.

---

# Title

The `title` property is a human-readable product name.

Example:

title: "Prodara"

This text is documentation text, not localized UI text.

---

# Version

The `version` property identifies the current product spec version.

Example:

version: "0.1.0"

This version refers to the product specification state, not necessarily generated application versioning.

---

# Description

The `description` property provides documentation-level context.

Example:

description: "A spec-first programming language for products"

Descriptions are not localized in v0.1.

---

# Modules List

The `modules` property lists the modules that conceptually belong to the product.

Example:

modules: [
  auth,
  billing,
  crm,
  design
]

This list provides an explicit workspace map.

The compiler may also discover modules from files, but the product declaration remains the canonical product root.

---

# Workspace Semantics

A workspace may contain many `.prd` files across many directories.

The product declaration gives tooling a canonical root from which to validate:

• expected modules  
• missing modules  
• unexpected modules  
• documentation order  

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• at most one product declaration exists  
• referenced modules exist  
• discovered modules match workspace expectations  

The product node becomes the root of the **Product Graph**.

---

# Publishes Block

The `publishes` block declares which constructs this product makes available for consumption by other products via `product_ref` declarations.

Example:

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

The `publishes` block may contain lists for any construct kind: `actors`, `entities`, `values`, `enums`, `events`, `surfaces`, `tokens`, `strings`.

All listed symbols must exist in one of the product's modules. The compiler validates this.

If a product has no `publishes` block, it does not expose any constructs for cross-product consumption.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• at most one product declaration exists  
• referenced modules exist  
• discovered modules match workspace expectations  
• all symbols in `publishes` resolve to existing declarations  

The product node becomes the root of the **Product Graph**.

---

# Future Extensions

Future versions may allow the product declaration to include:

default constitution  
default environments  
default language  
product-level policies  

These are excluded from v0.1 to keep the root construct minimal.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `product_decl` and `publishes_block`
- `model/product-graph.md` — Product node as graph root
- `language/v0.1/core/modules.md` — module declarations referenced by product
- `language/v0.1/product/product-refs.md` — cross-product references that consume published constructs