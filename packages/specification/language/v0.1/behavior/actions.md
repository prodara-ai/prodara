# Prodara Language Specification v0.1
## Actions

Actions define **invokable operations exposed by surfaces**.

An action is the bridge between an interaction surface and a workflow.

Actions do not contain logic themselves.  
They simply describe an operation that invokes a workflow.

This keeps the language layered:

surface -> action -> workflow

---

# Purpose of Actions

Actions exist to:

• expose workflows through surfaces  
• create reusable invokable operations  
• keep surfaces declarative  
• separate interaction semantics from behavior implementation  

Examples:

create_invoice  
open_invoice  
submit_payment  
cancel_subscription  

---

# Action Declaration

Actions are declared using the `action` keyword.

Example:

action create_invoice {

  title: "Create Invoice"

  workflow: create_invoice

}

---

# Action Properties

An action may contain:

title  
workflow  
description  

---

# Workflow Binding

The `workflow` property identifies the workflow invoked by the action.

Example:

workflow: create_invoice

Each action must reference exactly one workflow in v0.1.

---

# Title

The `title` property provides human-readable documentation text.

Example:

title: "Create Invoice"

If user-visible UI text is needed, surfaces or renderings should use localized strings.

---

# Action Reuse

The same action may be used by multiple surfaces.

Example:

surface invoice_list {
  actions: [
    create_invoice
  ]
}

surface dashboard {
  actions: [
    create_invoice
  ]
}

This allows a single operation to be exposed in multiple contexts.

---

# Surface Usage

Actions are referenced by surfaces.

Example:

surface invoice_list {

  actions: [
    create_invoice,
    open_invoice
  ]

}

---

# Security Relationship

Actions themselves do not enforce authorization.

Authorization is enforced by the referenced workflow.

Security policy declarations may also apply to actions.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• action names are unique within the module  
• referenced workflows exist  
• surfaces reference valid actions  

Actions become nodes within the **Product Graph**.

Edges connect actions to:

• workflows  
• surfaces  

---

# Best Practices

Actions should represent meaningful user or system operations.

Good examples:

create_invoice  
approve_payment  
download_report  

Poor examples:

set_flag  
call_http  

Actions should remain at the product semantics layer.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `action_decl`
- `model/product-graph.md` — Action node type and edges
- `language/v0.1/behavior/workflows.md` — workflows bound to actions
- `language/v0.1/interaction/surfaces.md` — surfaces exposing actions