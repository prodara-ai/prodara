# Prodara Language Specification v0.1
## Constitution

A constitution defines **generation, validation, architecture, and quality policies** that govern how a Prodara specification is interpreted and compiled into software.

Constitutions are one of Prodara’s defining features.

They allow teams to steer:

• tech stack  
• security defaults  
• privacy defaults  
• architecture constraints  
• code style expectations  
• testing expectations  
• generation policy  

A constitution is not product behavior.  
It is **governance for generation and validation**.

---

# Purpose of Constitutions

Constitutions exist to:

• steer implementation choices  
• define reusable policy templates  
• import shared policy packages  
• allow module-level overrides  
• make generation deterministic and governed  

---

# Constitution Declaration

A constitution is declared using the `constitution` keyword.

Example:

constitution default_product {

  use: [
    registry/web/angular@1.2,
    registry/backend/nestjs@1.1,
    registry/database/postgres@2.0
  ]

  policies {

    stack {
      frontend: angular
      backend: nestjs
      database: postgres
    }

    security {
      authentication: required
      authorization: required
      audit_logging: required
    }

    testing {
      tests_required: true
      review_fix_loop: true
    }

    style {
      indentation: 2
      max_line_length: 100
      naming: camelCase
    }

  }

}

---

# Constitution Properties

A constitution may contain:

use  
applies_to  
policies  
description  

---

# Use

The `use` property imports reusable constitution packages.

Each imported package must be versioned.

Example:

use: [
  registry/web/angular@1.2,
  registry/backend/nestjs@1.1
]

Versioning is required so that constitutions remain reproducible even if registry contents move or change.

---

# Applies To

The `applies_to` property restricts a constitution to particular modules or constructs.

Example:

applies_to: [
  billing
]

If omitted, the constitution is considered product-wide.

---

# Policies Block

The `policies` block contains named policy sections.

Examples of policy sections include:

stack  
security  
privacy  
testing  
generation  
style  
lint  
storage  
architecture  

Constitutions are intentionally extensible at the policy-block level.

---

# Stack Policy

Example:

stack {
  frontend: angular
  backend: nestjs
  database: postgres
}

This steers generator targets.

---

# Style Policy

Example:

style {
  indentation: 2
  max_line_length: 100
  naming: camelCase
}

This allows teams to govern generated code style.

---

# Testing Policy

Example:

testing {
  tests_required: true
  workflow_tests_required: true
  review_fix_loop: true
}

---

# Security Policy

Example:

security {
  authentication: required
  authorization: required
  audit_logging: required
}

These defaults complement explicit `security` declarations in product modules.

---

# Constitution Layering

Typical constitution layers:

• registry constitution packages  
• product-wide constitution  
• module-specific constitution  

This allows reuse while preserving local control.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• constitution names are unique  
• versioned package references are syntactically valid  
• `applies_to` targets exist  
• policy blocks are well-formed  

Constitutions become policy nodes in the **Product Graph** or related compiler policy model.

---

# Best Practices

Constitutions should define governance, not product semantics.

Good examples:

• required backend stack  
• required auth model  
• code style  
• test expectations  

Poor examples:

• invoice must have total  
• customer may open invoice list  

Those belong in product semantics, not constitution.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `constitution_decl`
- `model/product-graph.md` — Constitution node type and edges
- `language/v0.1/core/modules.md` — modules targeted by constitution policies
- `registry/registry.md` — registry package format, resolution protocol, and AGENTS.md / SKILL.md structure