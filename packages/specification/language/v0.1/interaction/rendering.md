# Prodara Language Specification v0.1
## Rendering

Rendering defines **how surfaces are visually or structurally represented** on specific platforms.

While surfaces describe the **interaction structure** of a product, rendering describes **layout, positioning, styling, and presentation**.

This separation allows the same surface to be rendered differently for:

• web applications  
• mobile applications  
• desktop applications  
• CLI interfaces  
• documentation systems  

Rendering definitions are therefore **platform-aware** but remain **framework-agnostic**.

---

# Purpose of Rendering

Rendering definitions control:

• layout structure  
• component placement  
• responsive behavior  
• visual styling  
• data bindings  

Rendering does not define business behavior. Behavior belongs to workflows.

Rendering also does not define domain data. Data belongs to entities and values.

---

# Rendering Declaration

Rendering blocks are declared using the `rendering` keyword.

Example:

rendering invoice_list_web {

  target: invoice_list

  platform: web

}

A rendering always targets an existing surface.

---

# Rendering Target

The `target` property identifies the surface being rendered.

Example:

target: invoice_list

This indicates that the rendering describes how the `invoice_list` surface appears on the platform.

---

# Platform

The `platform` property indicates the platform for which the rendering is intended.

Example platforms include:

web  
mobile  
desktop  
cli  

Example:

platform: web

Different renderings may exist for the same surface.

Example:

rendering invoice_list_web { ... }

rendering invoice_list_mobile { ... }

---

# Layout

Rendering definitions describe layout using layout systems.

The most common layout system is a grid.

Example:

layout: grid

---

# Grid Layout

A grid layout divides the surface into rows and columns.

Example:

grid {

  columns: [240, 1fr, 320]

  rows: [auto, 1fr]

  gap: design.base.spacing.md

}

Columns may contain:

fixed sizes  
flexible fractions  
content-based sizing  

---

# Placement

Placement defines where nested surfaces appear within the layout.

Example:

placement {

  header: { row: 1, column: 1..3 }

  filters: { row: 2, column: 1 }

  table: { row: 2, column: 2 }

  summary: { row: 2, column: 3 }

}

Each entry corresponds to a nested surface defined within the surface specification.

---

# Data Binding

Rendering definitions may include data bindings for visual components.

Example concept:

bind {

  table.rows: invoice

}

This instructs the rendering engine to populate a component with data from an entity.

Bindings do not perform logic. Logic remains in workflows.

---

# Styling

Rendering definitions may reference design tokens.

Example:

style {

  background: design.base.color.surface_background

  padding: design.base.spacing.lg

}

Using tokens ensures consistent styling across the product.

---

# Token Binding Semantics

This section defines precisely how rendering definitions resolve design token references.

## Reference form

Rendering definitions reference tokens using the **base token path**:

    module_name.token_set_name.category.token_name

Example:

    design.base.color.surface_background

This path always refers to the base token set, never directly to a theme.

## Compile-time validation

The compiler must validate:

- the referenced module exists
- the referenced `tokens` declaration exists in that module
- the referenced category exists in the token set
- the referenced token name exists in the category

If any segment in the path does not resolve, the compiler must emit a diagnostic.

## Theme resolution

Themes override token values but do not change how renderings reference tokens. The resolution order is:

1. If an active theme overrides the token, use the theme value.
2. Otherwise, use the value from the base token set.

This means the same rendering definition works identically regardless of which theme is active. Renderings are theme-agnostic; themes are rendering-agnostic.

## Resolution timing

Token values are resolved at **generation time or runtime**, not at compile time. The compiler validates that paths are valid but does not substitute concrete values into the Product Graph.

The generated code must support runtime theme switching. This typically means the generation system produces a token indirection layer (CSS custom properties, theme providers, or equivalent) rather than inlining token values.

## Breakpoint token references

Responsive blocks (`at` rules) reference breakpoint tokens:

    at design.base.breakpoint.md { ... }

The compiler validates that the breakpoint path exists and resolves to a token in the `breakpoint` category. The numeric value of the breakpoint is determined at generation time using the same resolution rules (theme override > base value).

## Grid gap token references

Grid gap values may reference spacing tokens:

    gap: design.base.spacing.md

These references follow the same resolution rules as style token references.

## Product Graph encoding

In the Product Graph, token references in rendering nodes are emitted as unresolved paths. The `uses_token` edge connects the rendering node to the token set node, with an attribute identifying the specific token path.

This preserves the indirection and allows planners and generators to reason about token dependencies without flattening values prematurely.

---

# Responsive Behavior

Rendering definitions may define behavior for different breakpoints.

Example:

at design.base.breakpoint.md {

  grid {

    columns: [1fr]

  }

}

Responsive rules allow layouts to adapt to different screen sizes.

---

# Component Types

Renderings may specify UI component types.

Example concept:

components {

  table: data_table

  filters: filter_panel

}

Component types map surfaces to platform-specific components.

The exact mapping is determined by the generation system.

---

# Rendering Composition

Rendering may reference nested surfaces recursively.

Example:

rendering dashboard_web {

  target: admin_dashboard

  placement {

    revenue_chart: { row: 1 }

    alerts_panel: { row: 2 }

  }

}

Each nested surface may have its own rendering.

---

# Rendering Independence

Rendering definitions should not embed business logic.

Rendering controls presentation only.

Business logic belongs to:

• workflows  
• rules  

Data structure belongs to:

• entities  
• values  

---

# Multiple Renderings

A surface may have multiple renderings.

Example:

rendering invoice_list_web

rendering invoice_list_mobile

rendering invoice_list_cli

This allows the same product specification to support multiple platforms.

---

# Rendering Validation

During compilation the compiler verifies:

• the target surface exists  
• referenced nested surfaces exist  
• referenced tokens exist  
• layout definitions are valid  

Valid rendering definitions become nodes in the **Product Graph**.

Edges connect renderings to:

• surfaces  
• tokens  
• breakpoints  

---

# Rendering Best Practices

Rendering should remain:

• declarative  
• reusable  
• token-driven  

Rendering definitions should avoid platform-specific code.

The generation system translates rendering definitions into implementation code.

---

# Future Extensions

Future versions of the language may add:

animation definitions  
advanced layout systems  
interaction states  
component libraries  

These features are excluded from v0.1 to maintain language simplicity.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `rendering_decl`
- `model/product-graph.md` — Rendering node type and edges
- `language/v0.1/interaction/surfaces.md` — surfaces targeted by rendering
- `language/v0.1/design/tokens.md` — design tokens used in styling