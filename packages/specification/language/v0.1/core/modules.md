# Prodara Language Specification v0.1
## Modules

Modules are the primary organizational construct of the Prodara language.

Every specification element in a product must exist inside a module.

Modules represent **bounded domains** within a product architecture. They provide structural boundaries for domain models, workflows, interaction surfaces, design definitions, and other system components.

Modules allow large products to be organized into coherent domains while preserving deterministic compilation and symbol resolution.

---

# Purpose of Modules

Modules serve several purposes within the Prodara language.

They provide:

• namespacing  
• architectural boundaries  
• symbol resolution domains  
• dependency management  
• team ownership boundaries  

Modules correspond conceptually to domain boundaries similar to those used in Domain-Driven Design.

Typical modules may include:

auth  
billing  
crm  
notifications  
analytics  
design  
platform  

Modules should represent **business capabilities**, not technical layers.

Example of good module boundaries:

billing  
payments  
crm  
identity  

Example of poor module boundaries:

database  
frontend  
backend  

Modules represent **capabilities**, not infrastructure layers.

---

# Module Declaration

Modules are declared using the `module` keyword.

Example:

module billing {

}

All language constructs must be defined within a module body.

Example:

module billing {

  entity invoice {
    invoice_id: uuid
    total: money
  }

}

---

# Open Modules

Modules are **open declarations**.

This means a module may be declared across multiple specification files. During compilation, the compiler merges all declarations belonging to the same module.

Example:

File A:

module billing {

  entity invoice {
    invoice_id: uuid
  }

}

File B:

module billing {

  workflow create_invoice {

  }

}

Both files contribute definitions to the same module.

This design allows large modules to be split across many specification files while still belonging to the same logical domain.

---

# Module Namespace

Each module defines a namespace.

Symbols inside a module are referenced using the module name.

Example:

billing.invoice  
billing.create_invoice  

This prevents naming conflicts across modules.

Example:

billing.invoice  
accounting.invoice  

Both are valid symbols because they exist in different module namespaces.

---

# Module Composition

A module may contain any of the following constructs:

**Imports:** `import`

**Domain:** `entity`, `value`, `enum`, `rule`

**Product structure:** `actor`, `capability`

**Behavior:** `workflow`, `action`, `event`, `schedule`

**Interaction:** `surface`, `rendering`

**Design system:** `tokens`, `theme`, `strings`

**Serialization:** `serialization`

**Platform:** `integration`, `transport`, `storage`, `execution`, `extension`

**Governance:** `constitution`, `security`, `privacy`, `validation`

**Runtime:** `secret`, `environment`, `deployment`

**Testing:** `test`

Example module:

module billing {

  entity invoice {
    invoice_id: uuid
  }

  enum invoice_status {

    draft {
      description: "Invoice created but not sent"
    }

    sent {
      description: "Invoice sent to the customer"
    }

    paid {
      description: "Invoice paid"
    }

  }

  workflow create_invoice {

  }

}

---

# Module Dependencies

Modules may reference symbols defined in other modules.

Dependencies are expressed using **imports**.

Example:

import customer from crm

Imports create explicit dependencies between modules.

Explicit dependencies improve architectural clarity and enable better analysis by the compiler.

---

# Module Boundaries

Modules should be designed so that:

• each module represents a cohesive domain  
• dependencies between modules remain minimal  
• modules remain understandable independently  

Modules should not grow excessively large.

When modules grow too large, they should be split into smaller modules representing clearer domain boundaries.

---

# Recommended Module Size

A typical module should contain:

5–20 entities  
related workflows  
surfaces exposing those workflows  

This size keeps modules understandable while allowing rich domain modeling.

---

# Compilation Behavior

During compilation, the compiler performs the following steps:

1. All `.prd` files are discovered.
2. Module declarations are parsed.
3. Module fragments are merged.
4. Symbols are indexed by module namespace.
5. Dependencies between modules are resolved.

The result becomes part of the **Product Graph**.

The Product Graph is the canonical semantic representation of the entire product.

---

# Module Evolution

Modules are expected to evolve as the product grows.

New constructs may be added to existing modules over time.

The open module model allows incremental product evolution without requiring centralized module definitions.

---

# Future Extensions

Future versions of the language may allow modules to declare additional metadata.

Possible future capabilities include:

module versioning  
module visibility rules  
module-level capabilities  
module security policies  

These features are intentionally excluded from v0.1 in order to keep the core language simple and stable.