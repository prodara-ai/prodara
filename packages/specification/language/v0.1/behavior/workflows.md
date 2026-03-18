# Prodara Language Specification v0.1
## Workflows

Workflows define product behavior.

They are the primary mechanism for expressing business logic in Prodara.

A workflow defines:

- capability classification
- authorization
- input contract
- data reads
- data writes
- applied rules
- execution steps
- transitions
- effects
- return contract
- optional non-action trigger through `on:`

## Purpose of Workflows

Workflows should represent meaningful business capabilities such as:

- create_invoice
- submit_payment
- cancel_subscription

They should not expose low-level technical operations as top-level product behavior.

## Workflow Declaration

Example:

    workflow create_invoice {

      capability: invoicing

      authorization {
        accountant: [invoice.create]
        admin: [invoice.create]
      }

      input {
        customer: crm.customer
        due_date: date
        notes: optional<string>
      }

      reads {
        crm.customer
      }

      writes {
        invoice
      }

      rules {
        customer_must_exist
        invoice_total_positive
      }

      steps {
        call validate_customer
        call build_invoice

        decide customer_valid {
          when yes -> call calculate_total
          when no -> fail invalid_customer
        }

        call persist_invoice
        call notify_customer
      }

      transitions {
        invoice.status: draft -> issued
      }

      effects {
        audit "Invoice created"
        notify notifications.send_email
        emit invoice_created
      }

      returns {
        ok: invoice
        error: invoice_error
      }

    }

## Action-triggered vs non-action-triggered workflows

Actions point to workflows through action declarations.

Workflows use `on:` only for non-action triggers such as:

- events
- schedules

Example:

    workflow reconcile_invoices {

      on: nightly_reconciliation

      reads {
        invoice
      }

      returns {
        ok: boolean
      }

    }

## Steps

In v0.1, steps support:

- `call`
- `decide`
- `fail`

Nested workflows are expressed only through `call`.

## Authorization

Authorization maps actors to permission lists.

Authorization is evaluated before workflow execution begins.

### Permission syntax

Permission entries use qualified names of the form `entity.operation`.

Example:

    authorization {
      accountant: [invoice.create]
      admin: [invoice.create, invoice.void]
    }

In this example, `invoice.create` and `invoice.void` are **permission tokens**. They are symbolic labels, not entity field references.

The format is:

    entity_name.operation_name

Where `entity_name` must resolve to a declared entity and `operation_name` is one of the recognized standard operations or a domain-specific operation declared in the workflow.

#### Standard operations

The following operation names are recognized by the compiler as standard CRUD operations:

    create
    read
    update
    delete

#### Domain-specific operations

Workflows may define permission tokens with custom operation names beyond the standard set. These represent domain-specific operations such as:

    invoice.void
    invoice.approve
    subscription.cancel
    order.fulfill

Custom operations must appear as an operation name in at least one authorization block in the workspace. The compiler tracks all distinct permission tokens and validates that:

- the entity portion resolves to a valid entity declaration
- each permission token is used consistently across workflows (same entity, same operation name)
- no permission token is declared but never authorized to any actor

#### Permission token scope

Permission tokens are global to the product. If `billing.invoice.create` and `crm.invoice.create` appear, they are distinct tokens because they reference different entities in different modules.

When referencing cross-module entities, the permission token uses the local name after import:

    import customer from crm

    authorization {
      admin: [customer.read]
    }

### Actor references

Actors listed on the left side of authorization entries must resolve to declared `actor` constructs. If no actor declarations exist in the workspace, authorization actor names are treated as unverified identifiers with a compiler warning.

## Effects

Effects are declared explicitly. The v0.1 grammar supports four forms:

- `audit "message"` — record an audit log entry
- `notify symbol_ref` — trigger a notification
- `emit symbol_ref` — emit a declared event
- `symbol_ref` — bare symbol reference for custom or extension-defined effects

## Compiler Responsibilities

The compiler verifies:

- workflow names are unique
- capability references exist
- actors referenced by authorization exist when actor declarations are present
- read and write targets exist
- rules exist
- called workflows exist
- transitions reference valid entity fields and enum values
- effect targets exist

Workflows become central **Product Graph** nodes with rich dependency edges.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `workflow_decl`
- `model/product-graph.md` — Workflow node type and edges
- `language/v0.1/behavior/actions.md` — actions that bind to workflows
- `language/v0.1/behavior/events.md` — events that trigger workflows
- `language/v0.1/behavior/schedules.md` — schedules that trigger workflows
- `language/v0.1/product/capabilities.md` — capability grouping
- `language/v0.1/domain/rules.md` — rules referenced in workflow steps
