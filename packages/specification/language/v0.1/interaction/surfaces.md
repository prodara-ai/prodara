# Prodara Language Specification v0.1
## Surfaces

Surfaces define interaction boundaries between users or systems and the product.

A surface represents any interface through which behavior can be triggered or information can be presented.

Surfaces are intentionally abstract and platform-agnostic. They define:

- interaction structure
- workflow entry points through actions and hooks
- data bindings
- composition through nested surfaces

Rendering defines how a surface appears.

## Purpose of Surfaces

Surfaces model:

- UI views
- forms
- dashboards
- APIs
- CLI commands
- other interaction entry points

## Surface Declaration

Example:

    surface invoice_list {

      kind: view

      title: billing.invoice_strings.invoice_list_title

      binds: invoice

      actions: [
        create_invoice,
        open_invoice
      ]

      hooks {
        load: load_invoices
      }

      surfaces: [
        filter_bar,
        invoice_table
      ]

    }

## Surface Properties

A surface may contain:

- kind
- title (direct string or symbol reference to a strings entry)
- description
- capability
- binds
- serialization
- surfaces
- actions
- hooks
- fields
- rules

Not every property is valid or useful on every surface kind, but the grammar allows these shared forms.

## Kinds

Common kinds include:

- view
- form
- dashboard
- api
- command

## Actions

The `actions` list references action declarations. Actions do not contain logic; they expose workflows through surfaces.

## Hooks

Hooks define automatic lifecycle behavior. Each hook maps a name to a workflow reference.

Hook names are an **open set** in v0.1. The grammar accepts any valid identifier as a hook name:

    hook_decl = identifier ":" symbol_ref ;

Common hook names used in v0.1 examples:

- `load` — fetch data when the surface is entered
- `refresh` — re-fetch data on demand

Implementations may define and document additional hook names (e.g., `submit`, `validate`, `dismiss`).

### Unknown hook policy

The compiler validates that every hook value resolves to a declared workflow.

Hook *names* are not validated against a fixed list in v0.1. However:

- Implementations **must** document their supported hook names.
- A hook name not recognised by the target platform **must** produce a warning (not a silent ignore).
- Tooling **should** offer completions for platform-supported hook names when a constitution specifies the target platform.

Future versions may introduce a closed set of standard hook names or a mechanism for platforms to declare supported hooks explicitly.

## Nested Surfaces

The `surfaces` list creates recursive composition.

Nested surfaces are semantic composition, not visual placement. Visual placement belongs to rendering.

## Serialization

API-oriented surfaces may reference a serialization policy.

## Rules and Fields

Form-like surfaces may also include:

- `fields`
- `rules`

These are most commonly used with `kind: form`.

## Responsibilities

Surfaces define:

- interaction structure
- surface composition
- workflow entry points
- domain bindings

Surfaces do not define:

- visual layout
- styling
- technical transport details

## Compiler Responsibilities

The compiler verifies:

- surface names are unique within the module
- referenced bindings exist
- referenced actions exist
- referenced hooks target workflows
- nested surfaces exist
- referenced serialization policies exist when used

Surfaces become nodes in the Product Graph.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `surface_decl`
- `model/product-graph.md` — Surface node type and edges
- `language/v0.1/interaction/rendering.md` — visual layout for surfaces
- `language/v0.1/behavior/actions.md` — actions exposed on surfaces
- `language/v0.1/serialization/serialization.md` — data format policies
