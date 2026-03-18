# Prodara Language Specification v0.1
## Security

Security declarations define **required security properties** of product components.

Security is broader than workflow authorization.

While workflow `authorization` answers:

“who may execute this workflow?”

the `security` construct answers:

“what security guarantees must hold for this thing?”

Security declarations are part of making Prodara enterprise-ready.

---

# Purpose of Security

Security declarations exist to express requirements such as:

• authentication required  
• authorization required  
• audit logging required  
• encrypted transport required  
• secret isolation required  

They may apply to:

• modules  
• surfaces  
• workflows  
• actions  
• integrations  

---

# Security Declaration

Security is declared using the `security` keyword.

Example:

security billing_api_security {

  applies_to: [
    invoice_api,
    create_invoice_form,
    create_invoice
  ]

  requires: [
    authentication,
    authorization,
    audit_logging,
    encrypted_transport
  ]

}

---

# Security Properties

A security declaration may contain:

applies_to  
requires  
description  

---

# Applies To

The `applies_to` property lists the constructs to which the security requirement applies.

Example:

applies_to: [
  invoice_api,
  create_invoice
]

Targets may include symbols from the current module or qualified symbols.

---

# Requires

The `requires` property lists the required security properties.

Example:

requires: [
  authentication,
  authorization,
  audit_logging
]

These values are semantic policy labels interpreted by the compiler, planner, and constitution-aware generators.

---

# Typical Security Requirements

Common requirement values include:

authentication  
authorization  
audit_logging  
encrypted_transport  
secret_isolation  
rate_limiting  

Additional requirement names may be introduced by constitutions or tooling.

---

# Relationship to Workflows

Workflows still define direct execution authorization.

Example:

authorization {
  admin: [invoice.void]
}

Security declarations complement this by adding broader requirements.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• security names are unique within the module  
• targets exist  
• requirement lists are valid syntactically  

Security declarations become nodes in the **Product Graph**.

Edges connect them to the constructs they govern.

---

# Best Practices

Security declarations should be used for broad guarantees.

Examples:

• all billing APIs require audit logging  
• payment workflows require encrypted transport  
• admin surfaces require authentication  

Use workflow authorization for direct execution permissions.  
Use security declarations for broader policy guarantees.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `security_decl`
- `model/product-graph.md` — Security node type and edges
- `language/v0.1/behavior/workflows.md` — workflow authorization
