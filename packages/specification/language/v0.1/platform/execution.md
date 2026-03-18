# Prodara Language Specification v0.1
## Execution

Execution declarations define **runtime execution refinements** for workflows.

Execution is not part of workflow semantics.  
It controls how a workflow is realized at runtime.

This separation keeps workflows portable and declarative.

---

# Purpose of Execution

Execution exists to:

• specify sync vs async behavior  
• support runtime scheduling styles  
• allow operational tuning  
• keep semantic workflow definitions clean  

---

# Execution Declaration

Execution is declared using the `execution` keyword.

Example:

execution create_invoice_mode {

  target: create_invoice

  mode: synchronous

}

Another example:

execution reconcile_mode {

  target: reconcile_invoices

  mode: scheduled

}

---

# Properties

An execution declaration may contain:

target  
mode  
description  

---

# Target

The `target` property identifies the workflow being refined.

Example:

target: create_invoice

---

# Mode

The `mode` property defines the runtime execution style.

Examples:

synchronous  
asynchronous  
scheduled  

Future versions may add richer execution policies.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• execution names are unique  
• target workflows exist  
• mode values are valid  

Execution declarations become nodes or refinements in the **Product Graph**.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `execution_decl`
- `model/product-graph.md` — Execution node type and edges
- `language/v0.1/behavior/workflows.md` — workflows targeted by execution hints