# Prodara Language Specification v0.1
## Storage

Storage declarations define **persistence refinements** for entities.

Storage is not the source of truth for the domain model.  
Entities remain the source of truth.  
Storage declarations refine how those entities should be realized.

---

# Purpose of Storage

Storage exists to:

• refine persistence strategies  
• allow technical tuning  
• support advanced users  
• remain separate from domain semantics  

---

# Storage Declaration

Storage is declared using the `storage` keyword.

Example:

storage invoice_storage {

  target: invoice

  model: relational

  table: "invoices"

  indexes: [
    [customer, status],
    unique [invoice_id]
  ]

}

---

# Properties

A storage declaration may contain:

target  
model  
table  
indexes  
description  

---

# Target

The `target` property identifies the entity being refined.

Example:

target: invoice

---

# Model

The `model` property identifies the persistence style.

Examples:

relational  
document  
event_store  

---

# Indexes

Indexes are optional technical refinements.

Example:

indexes: [
  [customer, status],
  unique [invoice_id]
]

Exact lowering is implementation-dependent.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• storage names are unique  
• targets exist and are entities  
• index field names exist on the target entity  

Storage declarations become nodes or refinements in the **Product Graph**.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `storage_decl`
- `model/product-graph.md` — Storage node type and edges
- `language/v0.1/domain/entities.md` — entities targeted by storage declarations