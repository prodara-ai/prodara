# Example: Contact Form

This example demonstrates a simple lead-capture page. It exercises language features focused on **form surfaces**: the `fields` block, `hooks` (submit), **validation rules**, **validation governance**, **transport**, **execution**, and **form rendering**.

---

## What You'll Learn

| Concept                  | Construct                       | File           |
|--------------------------|---------------------------------|----------------|
| Form surface             | `kind: form`                    | leads.prd      |
| Fields block             | `fields { name: string ... }`   | leads.prd      |
| Submit hook              | `hooks { submit: ... }`         | leads.prd      |
| Rules on forms           | `rules: [email_required, ...]`  | leads.prd      |
| Validation governance    | `validation form_validation`    | leads.prd      |
| Transport                | `transport form_transport`      | platform.prd   |
| Execution mode           | `execution lead_submission`     | platform.prd   |
| Form rendering           | `rendering form_layout`         | platform.prd   |

---

## Product Structure

    product contact_form {
      title: "Contact Form"
      version: "0.1.0"
      modules: [leads, platform]
    }

- `leads` — domain, form surface, validation, workflow
- `platform` — transport, execution, rendering, serialization

---

## Key Patterns

### Form surface with fields

Unlike a view surface, a form declares the fields the user fills in:

    surface contact_form {
      kind: form
      title: leads.form_strings.form_title
      binds: lead

      fields {
        name: string
        email: string
        message: string
      }

      rules: [email_required, message_not_empty]

      hooks {
        submit: submit_lead
      }
    }

### Validation governance

Declares non-functional requirements for a public-facing form:

    validation form_validation {
      applies_to: [contact_form]
      requires: [input_sanitization, rate_limiting]
    }

### Transport

Tells the compiler how the surface communicates:

    transport form_transport {
      target: leads.contact_form
      protocol: http
      style: rest
    }

### Execution

Controls how a workflow runs:

    execution lead_submission {
      target: leads.submit_lead
      mode: sync
    }
