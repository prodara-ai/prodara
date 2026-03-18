# Prodara Language Specification v0.1
## Design System: Tokens

Design tokens define **the foundational visual primitives of a product's design system**.

Tokens represent values such as colors, spacing, typography scales, breakpoints, and other reusable visual constants. They allow visual consistency across the entire product while keeping rendering definitions declarative and portable.

Tokens are not tied to any specific UI framework. They exist at the specification level and are referenced by rendering definitions.

---

# Purpose of Tokens

Tokens exist to:

• standardize visual values across the product  
• separate design decisions from rendering structure  
• enable consistent theming  
• support platform-specific implementations  
• allow AI systems to reason about design primitives  

Without tokens, rendering definitions would contain raw values, which makes designs inconsistent and harder to maintain.

Example problem without tokens:

padding: 12
background: “#2E6BFF”

Example using tokens:

padding: design.base.spacing.md
background: design.base.color.brand_primary

---

# Token Declaration

Tokens are declared using the `tokens` keyword.

Example:

tokens base {

color: {

brand_primary: "#2E6BFF"

surface_background: "#FFFFFF"

text_primary: "#111827"

}

spacing: {

xs: 4

sm: 8

md: 12

lg: 16

xl: 24

}
}


Tokens are typically defined in the **design module**.

Example:

module design {

tokens base {
…
}

}

---

# Token Categories

Tokens are grouped into categories.

Common categories include:

color  
spacing  
typography  
radius  
shadow  
breakpoint  
z_index  

Example:

tokens base {

color: {
brand_primary: “#2E6BFF”
}

spacing: {
md: 12
}

}

---

# Color Tokens

Color tokens represent reusable color values.

Example:

color {

brand_primary: “#2E6BFF”

brand_secondary: “#9333EA”

surface_background: “#FFFFFF”

surface_muted: “#F3F4F6”

text_primary: “#111827”

text_secondary: “#6B7280”

}

These values are referenced by rendering definitions.

Example usage:

style {

background: design.base.color.surface_background

}

---

# Spacing Tokens

Spacing tokens represent consistent layout spacing.

Example:

spacing {

xs: 4

sm: 8

md: 12

lg: 16

xl: 24

xxl: 32

}

Spacing tokens are commonly used in:

padding  
margin  
grid gaps  

Example usage:

gap: design.base.spacing.md

---

# Breakpoint Tokens

Breakpoint tokens define responsive layout thresholds.

Example:

breakpoint {

sm: 640

md: 768

lg: 1024

xl: 1280

}

These breakpoints are used in rendering rules.

Example:

at design.base.breakpoint.md {

grid {

columns: [1fr]

}

}

---

# Typography Tokens

Typography tokens define font families and size scales.

Example:

typography {

font_body: “Inter”

font_heading: “Inter”

size_sm: 12

size_md: 16

size_lg: 20

size_xl: 28

}

These values guide the rendering system when generating UI implementations.

---

# Radius Tokens

Radius tokens define border radius values.

Example:

radius {

sm: 2

md: 4

lg: 8

}

Example usage:

style {

border_radius: design.base.radius.md

}

---

# Token Referencing

Tokens are referenced using module paths.

Example:

design.base.color.brand_primary

Structure:

module.tokenset.category.token_name

Example breakdown:

design.base.color.brand_primary
│
│      │     │
│      │     └ token
│      └ category
└ token set

---

# Token Organization

Large products often define tokens in layers.

Example:

tokens base { … }

tokens product { … }

tokens marketing { … }

Each token set may override or extend another set.

---

# Token Evolution

Tokens evolve as the product design system evolves.

Typical changes include:

• adding new tokens  
• adjusting color palettes  
• extending spacing scales  

Existing tokens should rarely be removed because they may already be referenced by rendering definitions.

---

# Token Validation

During compilation the compiler verifies:

• token names are unique  
• categories are valid  
• token references resolve correctly  

Tokens become nodes within the **Product Graph** and may be referenced by rendering definitions.

---

# Best Practices

Tokens should represent **design intent**, not arbitrary values.

Examples of good tokens:

brand_primary  
surface_background  
text_primary  

Examples of poor tokens:

blue_1  
padding_12  
margin_5  

Tokens should describe meaning rather than implementation details.

---

# Future Extensions

Future versions of the language may introduce:

token inheritance  
token versioning  
computed tokens  
environment-specific tokens  

These features are intentionally excluded from v0.1 to keep token definitions simple and deterministic.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `tokens_decl`
- `model/product-graph.md` — TokenSet node type and edges
- `language/v0.1/design/themes.md` — themes that extend token sets
- `language/v0.1/interaction/rendering.md` — rendering that references tokens in styling