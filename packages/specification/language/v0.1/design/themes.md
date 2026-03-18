# Prodara Language Specification v0.1
## Design System: Themes

Themes define **named visual overrides** that extend a base token set.

A theme inherits all token values from the token set it extends and selectively overrides specific tokens. This allows a product to support multiple visual appearances (e.g., light and dark modes) from a single base design system.

---

# Purpose of Themes

Themes exist to:

- support multiple visual modes (light, dark, high-contrast)
- allow branded or contextual visual variants
- inherit base tokens so overrides remain minimal
- keep rendering definitions theme-agnostic

---

# Theme Declaration

Themes are declared using the `theme` keyword.

Example:

    theme dark {
      extends: base

      color: {
        surface_background: "#111827"
        text_primary: "#F9FAFB"
      }
    }

---

# Theme Properties

A theme must contain:

## extends

The `extends` property identifies the token set being extended.

Example:

    extends: base

The referenced identifier must resolve to a `tokens` declaration within the same module.

## Token category overrides

After the `extends` declaration, a theme may include any number of token category blocks that override specific tokens from the base set.

Example:

    color: {
      surface_background: "#111827"
      text_primary: "#F9FAFB"
    }

Only overridden tokens need to appear. All non-overridden tokens inherit from the base token set.

---

# Theme Inheritance

Themes inherit all categories and tokens from the base token set.

If the base token set defines:

    tokens base {
      color: {
        brand_primary: "#2E6BFF"
        surface_background: "#FFFFFF"
        text_primary: "#111827"
      }

      spacing: {
        md: 12
        lg: 16
      }
    }

And the theme defines:

    theme dark {
      extends: base

      color: {
        surface_background: "#111827"
        text_primary: "#F9FAFB"
      }
    }

Then the effective token values for the `dark` theme are:

    color.brand_primary: "#2E6BFF"       (inherited)
    color.surface_background: "#111827"   (overridden)
    color.text_primary: "#F9FAFB"        (overridden)
    spacing.md: 12                        (inherited)
    spacing.lg: 16                        (inherited)

---

# Theme Usage

Themes are not directly referenced by renderings in v0.1.

Rendering definitions reference tokens using their base token paths (e.g., `design.base.color.brand_primary`).

The generation system resolves the active theme at runtime or build time and substitutes the correct values.

Future versions may allow renderings or surfaces to explicitly select a theme.

---

# Multiple Themes

A module may define multiple themes extending the same token set.

Example:

    theme dark {
      extends: base
      color: {
        surface_background: "#111827"
      }
    }

    theme high_contrast {
      extends: base
      color: {
        surface_background: "#000000"
        text_primary: "#FFFFFF"
      }
    }

---

# Theme Naming

Theme names must be unique within a module.

Theme names should describe the visual purpose:

Good examples:

    dark
    high_contrast
    brand_alternate

Poor examples:

    theme_1
    override

---

# Compiler Responsibilities

During compilation, the compiler verifies:

- theme names are unique within the module
- the `extends` reference resolves to a valid `tokens` declaration
- overridden token categories exist in the base token set
- overridden token keys exist in their respective categories in the base token set

Themes become nodes in the **Product Graph**.

Edges connect themes to:

- the token set they extend
- overridden token paths

---

# Future Extensions

Future versions of the language may add:

- theme chaining (theme extending another theme)
- explicit theme selection in renderings or surfaces
- conditional token resolution
- runtime theme switching declarations

These features are intentionally excluded from v0.1 to keep the theme model simple and deterministic.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `theme_decl`
- `model/product-graph.md` — Theme node type and edges
- `language/v0.1/design/tokens.md` — base token sets that themes extend
