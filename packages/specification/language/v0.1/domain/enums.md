# Prodara Language Specification v0.1
## Domain Model: Enums

Enums define **finite sets of named values**.

They are used to model domain states, classifications, and constrained value sets within the product specification.

Enums are commonly used for:

• lifecycle states  
• status fields  
• configuration options  
• categorical values  

Enums improve correctness by preventing invalid values from being used in domain models.

---

# Purpose of Enums

Enums represent values that:

• belong to a fixed set  
• are known at specification time  
• should not accept arbitrary values  

Examples of common enums:

invoice_status  
payment_state  
user_role  
subscription_plan  

Using enums ensures that workflows, entities, and surfaces only use valid values.

---

# Enum Declaration

Enums are declared using the `enum` keyword.

Example:

enum invoice_status {

  draft {
    description: "Invoice created but not sent"
  }

  sent {
    description: "Invoice sent to the customer"
  }

  paid {
    description: "Invoice has been paid"
  }

  overdue {
    description: "Payment deadline passed"
  }

}

Each enum consists of a set of **named values**.

---

# Enum Values

Enum values must be:

• unique within the enum  
• lowercase snake_case by convention  

Example:

enum user_role {

  admin {
    description: "System administrator"
  }

  staff {
    description: "Internal staff member"
  }

  customer {
    description: "External customer"
  }

}

---

# Enum Value Metadata

Each enum value may contain metadata.

The most important metadata field is:

description

Example:

paid {
  description: "Invoice has been paid"
}

Descriptions help:

• documentation generation  
• AI reasoning  
• developer understanding  

Descriptions are strongly recommended.

---

# Using Enums in Entities

Enums are commonly used as entity fields.

Example:

entity invoice {

  invoice_id: uuid

  status: invoice_status

  total: money

}

This ensures that invoice status can only be one of the defined enum values.

---

# Using Enums in Workflows

Workflows often transition entity states defined by enums.

Example:

transitions {

  invoice.status: draft -> sent

}

This expresses that the workflow transitions the invoice from draft to sent.

---

# Enum Referencing

Enum values are referenced using dot notation.

Example:

invoice_status.draft  
invoice_status.sent  
invoice_status.paid  

These references are fully qualified values.

---

# Enum Stability

Enums should be designed carefully because changes can affect system behavior.

Safe changes:

• adding new enum values  
• adding descriptions  

Risky changes:

• removing enum values  
• renaming enum values  

When enum values are removed, existing data may become invalid.

---

# Enum Ordering

Enum value order has **no semantic meaning**.

Order exists only for readability.

The compiler treats enum values as unordered sets.

---

# Enum Namespaces

Enums exist within module namespaces.

Example:

billing.invoice_status  
crm.customer_status  

This prevents collisions between modules.

---

# Enum Best Practices

Enums should represent **stable domain concepts**.

Examples of good enums:

invoice_status  
payment_method  
subscription_plan  

Examples of poor enums:

temporary_flags  
runtime_states  

Enums should not represent ephemeral values.

---

# Enum Evolution

Enums may evolve over time as products grow.

Common evolution patterns include:

• adding new lifecycle states  
• introducing new categories  
• refining classifications  

When evolving enums, developers should ensure that workflows and rules are updated accordingly.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• enum names are unique within a module  
• enum values are unique within the enum  
• referenced enums exist  
• enum values referenced in workflows or rules exist  

Enums are then added as nodes within the **Product Graph**.

---

# Future Extensions

Future versions of the language may allow enums to include:

display labels  
localization keys  
ordering metadata  
value deprecation markers  

These features are intentionally excluded from v0.1 to keep the enum model simple.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `enum_decl`
- `model/product-graph.md` — Enum node type and edges
- `language/v0.1/core/type-system.md` — enum as field type