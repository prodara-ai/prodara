# Prodara Language Specification v0.1
## Symbol Resolution

Symbol resolution defines **how identifiers and qualified names are bound to declarations**.

It is one of the most important parts of the language because deterministic symbol resolution is required for:

• parsing to semantics  
• validation  
• Product Graph construction  
• AI-assisted editing  
• language service behavior  

---

# Resolution Domains

Symbols are resolved within module namespaces.

Each declaration belongs to a module.

Examples:

billing.invoice  
crm.customer  
design.base.color.brand_primary  

---

# Resolution Order

For an unqualified symbol reference, the compiler resolves in this order:

1. current module declarations  
2. explicit import aliases  
3. explicit imported symbols  

Fully-qualified references are resolved directly by module path.

---

# Examples

Current module resolution:

module billing {

  entity invoice {
    invoice_id: uuid
  }

  workflow create_invoice {

    writes {
      invoice
    }

  }

}

Here `invoice` resolves to `billing.invoice`.

---

# Import Alias Resolution

Example:

import invoice as billing_invoice from billing

Then:

billing_invoice

resolves to `billing.invoice`.

Aliases take precedence over imported symbol names.

---

# Fully Qualified Resolution

Example:

crm.customer

This bypasses local ambiguity and resolves directly to the module and symbol path.

Fully-qualified references are preferred when ambiguity exists.

---

# Ambiguity

If two imported symbols share the same unqualified name, and neither alias is used, resolution is ambiguous.

Example:

import invoice from billing
import invoice from accounting

Reference:

invoice

This must produce a compile error.

The user must use:

• an alias  
• or a fully-qualified reference  

---

# Duplicate Declarations

Duplicate declaration names of the same kind within the same module are errors unless explicitly allowed by future language rules.

Example:

entity invoice { ... }
entity invoice { ... }

This is invalid.

---

# Open Module Merging

Modules are open, so declarations across multiple files are merged into the same namespace.

This does not permit duplicate symbols unless explicitly defined by future extensions.

---

# Compiler Responsibilities

During semantic analysis, the compiler must:

• build module symbol tables  
• resolve imports and aliases  
• resolve unqualified references  
• resolve qualified references  
• detect ambiguities  
• detect duplicate declarations  

Resolved symbol bindings become edges in the **Product Graph**.