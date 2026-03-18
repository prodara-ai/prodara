# Prodara Language Specification v0.1
## Imports

Imports allow a module to reference symbols defined in other modules.

Imports create explicit dependencies between modules and enable the compiler to resolve cross-module references deterministically.

Imports are required whenever a module references a symbol that is defined outside of the current module.

---

# Purpose of Imports

Imports serve several purposes within the Prodara language.

They:

• enable cross-module references  
• establish explicit module dependencies  
• allow aliasing of imported symbols  
• support deterministic symbol resolution  
• help maintain architectural clarity  

Explicit imports make product architectures easier to understand and analyze.

---

# Import Syntax

Imports are declared using the `import` keyword.

Basic syntax:

import symbol from module

Example:

import customer from crm

This allows the current module to reference the `customer` entity defined in the `crm` module.

---

# Multiple Imports

Multiple symbols may be imported from the same module.

Example:

import customer from crm
import account from crm
import contact from crm

Each imported symbol becomes available within the current module.

---

# Import Aliases

Symbols may be imported using an alias.

This allows a module to rename the imported symbol locally.

Syntax:

import symbol as alias from module

Example:

import invoice as billing_invoice from billing

The symbol can then be referenced as:

billing_invoice

Alias imports are useful when:

• symbol names conflict  
• clearer naming is desired  
• multiple modules define similar symbols  

---

# Importing Across Domains

Imports enable modules to interact across domain boundaries.

Example:

module billing {

  import customer from crm

  entity invoice {

    invoice_id: uuid

    customer: customer

    total: money

  }

}

In this example, the billing module references the customer entity from the crm module.

---

# Symbol Resolution

When the compiler encounters a symbol reference, it resolves the symbol using the following order:

1. symbols defined within the current module
2. explicitly imported symbols
3. fully-qualified module references

Fully-qualified references use the module name.

Example:

crm.customer
billing.invoice

Fully-qualified references do not require an import.

Example:

entity invoice {

  customer: crm.customer

}

However, using imports is recommended for readability.

---

# Deterministic Imports

Prodara requires imports to be deterministic.

This means:

• an imported symbol must exist
• symbols may not be imported from ambiguous modules
• circular dependencies must be resolvable

The compiler validates imports during the semantic analysis phase.

Invalid imports cause compilation errors.

---

# Import Scope

Imports apply to the entire module in which they are declared.

Example:

module billing {

  import customer from crm

  entity invoice {
    customer: customer
  }

  workflow create_invoice {

    input {
      customer: customer
    }

  }

}

Both the entity and workflow can reference the imported symbol.

---

# Avoiding Import Conflicts

Two imported symbols may conflict if they share the same name.

Example:

import invoice from billing
import invoice from accounting

This situation creates ambiguity.

To resolve the conflict, aliases should be used.

Example:

import invoice as billing_invoice from billing
import invoice as accounting_invoice from accounting

---

# Import Best Practices

The following practices are recommended:

• import only necessary symbols  
• avoid wildcard imports  
• prefer explicit imports  
• use aliases when names may conflict  

These practices keep module dependencies clear and maintainable.

---

# Compiler Behavior

During compilation, the compiler performs the following steps for imports:

1. collect all import statements
2. verify that referenced modules exist
3. verify that referenced symbols exist
4. resolve symbol aliases
5. construct the module dependency graph

The dependency graph becomes part of the **Product Graph**.

This graph enables the compiler to:

• detect dependency cycles  
• enforce module boundaries  
• optimize compilation  

---

# Circular Dependencies

Circular dependencies may occur when two modules reference each other.

Example:

billing imports customer from crm  
crm imports invoice from billing  

Circular dependencies are permitted when the compiler can resolve symbol references without ambiguity.

However, deeply nested circular dependencies should be avoided because they complicate architecture.

---

# Future Extensions

Future versions of the language may extend the import system with additional capabilities.

Potential extensions include:

import groups  
module-level imports  
conditional imports  
versioned imports  

These features are intentionally excluded from v0.1 to maintain a simple and predictable import model.

---

## See Also

- `language/v0.1/grammar.md` — import syntax
- `language/v0.1/core/symbol-resolution.md` — how symbols are resolved
- `language/v0.1/core/modules.md` — module organization
- `language/v0.1/product/product-refs.md` — cross-product references