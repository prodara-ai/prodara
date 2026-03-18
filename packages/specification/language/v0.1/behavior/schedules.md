# Prodara Language Specification v0.1
## Schedules

Schedules define named time-based triggers.

Schedules are reusable and may be referenced by workflows using `on:`.

## Schedule Declaration

Example:

    schedule nightly_reconciliation {

      cron: "0 2 * * *"

      description: "Runs every night at 02:00"

    }

## Cron

The `cron` property stores the schedule timing expression.

Cron interpretation is delegated to the target runtime.

## Workflow Usage

Example:

    workflow reconcile_invoices {

      on: nightly_reconciliation

      ...

    }

## Compiler Responsibilities

The compiler verifies:

- schedule names are unique
- referenced schedules exist
- workflows using `on:` target valid schedules or events

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `schedule_decl`
- `model/product-graph.md` — Schedule node type and edges
- `language/v0.1/behavior/workflows.md` — workflows triggered by schedules
