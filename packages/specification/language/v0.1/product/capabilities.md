# Prodara Language Specification v0.1
## Capabilities

Capabilities define **business-level product functions**.

They are used to group workflows and surfaces around meaningful product behavior.

Capabilities are one of the core constructs that make Prodara a **product language** rather than only a technical DSL.

Examples of capabilities:

invoicing  
payments  
user_management  
analytics  

---

# Purpose of Capabilities

Capabilities exist to represent:

• business functions  
• product feature groupings  
• high-level user value  

They enable:

• better documentation  
• AI understanding of product structure  
• grouping of workflows and surfaces  
• domain-oriented planning  

---

# Capability Declaration

Capabilities are declared using the `capability` keyword.

Example:

capability invoicing {

  title: "Invoicing"

  description: "Create and manage customer invoices"

  actors: [
    accountant,
    admin
  ]

}

---

# Capability Properties

A capability may contain:

title  
description  
actors  

---

# Title

The `title` property is a human-readable label.

Example:

title: "Invoicing"

Titles are documentation text, not localized UI strings.

---

# Description

The `description` property describes the purpose of the capability.

Example:

description: "Create and manage customer invoices"

---

# Actors

The `actors` list identifies actors typically associated with the capability.

Example:

actors: [
  accountant,
  admin
]

This is informational and semantic.  
Actual authorization is enforced at the workflow level.

---

# Capability Relationships

Capabilities may be referenced by:

• workflows  
• surfaces  

Example workflow usage:

workflow create_invoice {

  capability: invoicing

}

Example surface usage:

surface invoice_list {

  capability: invoicing

}

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• capability names are unique within the module  
• referenced actors exist when actor definitions are present  
• referenced capabilities exist in workflows and surfaces  

Capabilities become nodes within the **Product Graph**.

Edges connect capabilities to:

• workflows  
• surfaces  

---

# Best Practices

Capabilities should represent user- or business-facing functions.

Good examples:

invoicing  
reporting  
identity  

Poor examples:

database_access  
http_layer  

Capabilities should be business-oriented.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `capability_decl`
- `model/product-graph.md` — Capability node type and edges
- `language/v0.1/behavior/workflows.md` — workflows within capabilities
- `language/v0.1/interaction/surfaces.md` — surfaces within capabilities
- `language/v0.1/product/actors.md` — actors referenced by capabilities