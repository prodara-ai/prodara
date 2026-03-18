# Prodara Language Specification v0.1
## Privacy

Privacy declarations define **data handling and privacy requirements** for product components.

Privacy is distinct from security.

Security focuses on protection and access.  
Privacy focuses on retention, classification, redaction, export, and lifecycle handling of sensitive data.

---

# Purpose of Privacy

Privacy declarations exist to define:

• data classification  
• retention requirements  
• redaction behavior  
• export/erase expectations  

They may apply to:

• entities  
• surfaces  
• workflows  
• modules  

---

# Privacy Declaration

Privacy is declared using the `privacy` keyword.

Example:

privacy invoice_data_policy {

  applies_to: [
    invoice
  ]

  classification: business_sensitive

  retention: "7 years"

  redact_on: [
    public_invoice_view
  ]

}

---

# Privacy Properties

A privacy declaration may contain:

applies_to  
classification  
retention  
redact_on  
exportable  
erasable  
description  

---

# Classification

The `classification` property identifies the privacy sensitivity of the target.

Examples:

business_sensitive  
personal_data  
confidential  

Example:

classification: personal_data

---

# Retention

The `retention` property describes the required retention period.

Example:

retention: "7 years"

Retention values are descriptive in v0.1.  
Future versions may formalize them further.

---

# Redaction

The `redact_on` property lists surfaces where redaction is required.

Example:

redact_on: [
  public_invoice_view
]

This allows planners and generators to enforce privacy-aware presentation.

---

# Export and Erase Flags

A privacy declaration may specify whether the affected data must support export or erasure.

Example:

exportable: true
erasable: true

These are especially important for personal data.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• privacy names are unique within the module  
• referenced targets exist  
• referenced surfaces in `redact_on` exist  

Privacy declarations become nodes in the **Product Graph**.

Edges connect them to the governed constructs.

---

# Best Practices

Use privacy declarations for data-handling obligations, not access control.

Examples:

• customer data is personal_data  
• invoice retention is seven years  
• public surfaces must redact sensitive fields  

Use security for access/control guarantees.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `privacy_decl`
- `model/product-graph.md` — Privacy node type and edges
- `language/v0.1/domain/entities.md` — entities targeted by privacy policies
- `language/v0.1/governance/security.md` — related access control declarations
