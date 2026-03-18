# Prodara Language Specification v0.1
## Syntax Conventions

This document explains the human-facing syntax conventions of Prodara v0.1.

The authoritative formal grammar is defined in:

- `language/v0.1/grammar.md`

This document explains the conventions behind that grammar so contributors and implementers can keep the language consistent.

## Core shape

Prodara is a brace-delimited declarative language.

Most constructs follow this shape:

    keyword name {

      property: value

      block_name {
        ...
      }

    }

Examples:

    entity invoice {
      invoice_id: uuid
    }

    workflow create_invoice {
      writes {
        invoice
      }
    }

## Properties vs blocks

Prodara uses two major syntactic forms:

### Properties

Used for scalar or direct values.

Example:

    title: "Invoices"
    target: invoice_list
    platform: web

### Blocks

Used for structured or repeated data.

Example:

    authorization {
      admin: [invoice.create]
    }

    steps {
      call validate_customer
    }

## Lists

Lists are enclosed in square brackets and comma-separated.

Example:

    actions: [
      create_invoice,
      open_invoice
    ]

## Symbol references

Symbol references use identifier or dot-path form.

Examples:

    invoice
    crm.customer
    design.base.color.brand_primary

## Strings vs plain documentation text

Prodara distinguishes between two kinds of text:

### Plain text (string literals)

Plain text is used for internal documentation and metadata. It appears as inline string literals.

Plain text is appropriate for:

- `description` properties on any construct
- `title` properties on products, capabilities, actions, and actors
- `retention` in privacy declarations
- `cron` expressions in schedules
- `table` names in storage declarations
- `env` variable names in secrets
- `url` in environments
- constitution `version` and product `version`

Plain text is **not localized**.

### Localized text (string references)

Localized text is used for user-visible UI content. It appears as symbol references pointing to entries in `strings` declarations.

Localized text is appropriate for:

- `title` on surfaces (should reference a strings key)
- `message` on rules
- notification text
- button labels, form labels, and other UI-facing text

### Guideline

If the text will be shown to end users, it should use a `strings` reference.  
If the text is for developers, architects, or documentation, it should be a plain string literal.

## Workflow conventions

Workflow syntax in v0.1 is intentionally narrow.

A workflow uses:

- capability
- authorization
- input
- reads
- writes
- rules
- steps
- transitions
- effects
- returns
- `on:` only for event/schedule triggers

Actions bind to workflows separately.

## Surface conventions

Surfaces expose actions and may contain hooks and nested surfaces.

Hooks target workflows.

Actions reference `action` declarations.

Forms are modeled as surfaces with `kind: form`.

## Rendering conventions

Rendering targets a surface and defines presentation only.

Rendering may include:

- layout
- grid
- placement
- style
- bind
- components
- responsive `at` blocks

## Product root

A workspace should contain at most one `product` declaration.

Modules remain the primary semantic boundaries.

## Parser expectations

A conforming parser must not infer omitted delimiters or omitted braces.

Syntax should be explicit and deterministic.
