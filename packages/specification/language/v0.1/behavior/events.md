# Prodara Language Specification v0.1
## Events

Events define named asynchronous domain or system notifications.

Events are first-class symbols and may be:

- emitted by workflows
- referenced by non-action workflow triggers

## Event Declaration

Example:

    event invoice_created {

      payload: invoice

      description: "Raised after a successful invoice creation"

    }

## Payload

The `payload` property defines the type carried by the event.

Payloads may be:

- entities
- values

## Emission

Workflows emit events through effects:

    effects {
      emit invoice_created
    }

`emit` is part of the workflow effect syntax in v0.1.

## Consumption

Workflows may subscribe to events using `on:`.

Example:

    workflow sync_invoice_to_crm {

      on: invoice_created

      ...

    }

## Compiler Responsibilities

The compiler verifies:

- event names are unique
- payload types exist
- emitted events exist
- workflows referencing `on:` resolve to a valid event or schedule

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `event_decl`
- `model/product-graph.md` — Event node type and edges
- `language/v0.1/behavior/workflows.md` — workflows triggered by events
