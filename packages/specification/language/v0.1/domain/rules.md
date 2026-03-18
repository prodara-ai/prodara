# Prodara Language Specification v0.1
## Domain Model: Rules

Rules define **declarative validation constraints** on domain entities.

A rule expresses a condition that must hold true for a given entity, along with a human-readable message to display when the condition is violated.

Rules are referenced by workflows and surfaces to enforce domain invariants at well-defined points.

---

# Purpose of Rules

Rules exist to:

- express domain validation constraints declaratively
- separate validation logic from workflow execution logic
- enable reuse of the same validation across multiple workflows and surfaces
- make validation requirements visible in the Product Graph
- support AI-assisted validation reasoning

Examples of common rules:

    invoice_total_positive
    customer_email_required
    subscription_not_expired
    order_has_items

---

# Rule Declaration

Rules are declared using the `rule` keyword.

Syntax:

    rule identifier {
      entity: symbol_ref
      condition: expression
      message: symbol_ref
    }

Example:

    rule invoice_total_positive {
      entity: invoice
      condition: total.amount > 0
      message: billing.ui_strings.invoice_total_positive
    }

---

# Rule Properties

A rule must contain exactly three properties:

## entity

The `entity` property identifies the entity type being validated.

Example:

    entity: invoice

The referenced symbol must resolve to an entity declaration.

## condition

The `condition` property defines the validation expression.

Example:

    condition: total.amount > 0

See `language/v0.1/grammar.md` for the expression grammar.

In v0.1, conditions support:

- field access paths (e.g., `total.amount`, `status`)
- comparison operators: `>`, `<`, `>=`, `<=`, `==`, `!=`
- logical operators: `and`, `or`, `not`
- parenthesized grouping for precedence control
- literal values: numbers, strings, booleans, identifiers (for enum values)

Examples:

    condition: total.amount > 0
    condition: status != cancelled
    condition: email != ""
    condition: total.amount > 0 and status == draft
    condition: role == admin or role == manager
    condition: not status == cancelled
    condition: (status == draft or status == pending) and total.amount > 0

The left-hand side of a comparison must be a field access path on the target entity.

## message

The `message` property references a localized string key that describes the validation failure.

Example:

    message: billing.ui_strings.invoice_total_positive

The referenced symbol must resolve to a string entry in a `strings` declaration.

---

# Using Rules in Workflows

Workflows reference rules through the `rules` block.

Example:

    workflow create_invoice {
      rules {
        invoice_total_positive
      }
    }

Rules listed in a workflow are evaluated before the workflow completes its writes. If any rule fails, the workflow must not proceed.

---

# Using Rules in Surfaces

Form-like surfaces may reference rules to guide client-side or pre-submission validation.

Example:

    surface create_invoice_form {
      kind: form
      rules {
        invoice_total_positive
      }
    }

Surface-level rule references are informational in v0.1. Actual enforcement occurs at the workflow level.

---

# Rule Scope

Rules exist within module namespaces.

Example references:

    billing.invoice_total_positive
    crm.customer_email_required

Rules may be imported across modules using the standard import mechanism.

---

# Multiple Rules per Entity

An entity may have many rules.

Example:

    rule invoice_total_positive {
      entity: invoice
      condition: total.amount > 0
      message: billing.ui_strings.invoice_total_positive
    }

    rule invoice_has_customer {
      entity: invoice
      condition: customer != null
      message: billing.ui_strings.invoice_customer_required
    }

Multiple rules targeting the same entity are independent and evaluated separately.

---

# Rule Best Practices

Rules should express **domain invariants**, not workflow-specific logic.

Good examples:

    invoice_total_positive
    email_must_be_present
    subscription_has_plan

Poor examples:

    check_http_response
    validate_json_format

Rules should operate at the domain level.

Rules should be named descriptively to communicate intent.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

- rule names are unique within a module
- the `entity` reference resolves to a valid entity
- the `condition` expression is syntactically valid
- field access paths in the condition resolve to fields on the target entity (or its nested values)
- comparison operand types are compatible
- the `message` reference resolves to a valid string entry

Rules become nodes in the **Product Graph**.

Edges connect rules to:

- their target entity
- referenced string keys
- workflows that reference them
- surfaces that reference them

---

# Future Extensions

Future versions of the language may add:

- cross-entity rules
- rule severity levels (error, warning)
- rule grouping
- parameterized rules
- arithmetic expressions in conditions

These features are intentionally excluded from v0.1 to keep the rule model simple and deterministic.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `rule_decl` and `expression`
- `model/product-graph.md` — Rule node type and edges
- `language/v0.1/behavior/workflows.md` — workflows referencing rules in steps
- `language/v0.1/interaction/surfaces.md` — surfaces referencing rules for validation
- `language/v0.1/design/strings.md` — localized strings for rule messages