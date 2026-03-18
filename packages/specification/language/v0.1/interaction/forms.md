# Prodara Language Specification v0.1
## Forms

Forms are surfaces with `kind: form`.

They define structured data input that is validated and then used to invoke workflows.

## Relationship to Surfaces

Forms are not a separate top-level language construct in v0.1.

They are a specialization of `surface`.

Example:

    surface create_invoice_form {

      kind: form

      binds: invoice

      fields {

        customer: crm.customer
        due_date: date
        notes: optional<string>

      }

      rules {
        invoice_total_positive
      }

      actions: [
        submit_create_invoice
      ]

    }

## Fields

Form fields define the data collected from the actor.

Field syntax follows normal typed field rules.

## Rules

Forms may reference validation rules.

These rules should be checked before the linked workflow is executed.

## Actions

Forms expose actions like any other surface. A common convention is to define a submit action that points to the primary workflow for the form.

## Workflow Alignment

Form fields should typically align closely with workflow inputs, but this is not required to be textually identical in v0.1.

## Composition

Forms may include nested surfaces through `surfaces`.

This allows reusable form sections.

## Responsibilities

Forms define:

- input structure
- validation references
- action exposure

Rendering still controls visual layout and component choice.

---

## See Also

- `language/v0.1/interaction/surfaces.md` — forms are surface specializations
- `language/v0.1/interaction/rendering.md` — visual layout for form surfaces
- `language/v0.1/domain/rules.md` — validation rules referenced by forms
