# Prodara Language Specification v0.1
## Extensions

Extensions define **explicit seams where handwritten or custom implementation may attach to generated systems**.

They are essential for real-world adoption because not all behavior can or should be generated from the spec.

Extensions allow Prodara to remain safe under regeneration.

---

# Purpose of Extensions

Extensions exist to:

• define stable custom-code seams  
• separate generated and handwritten logic  
• preserve regeneration safety  
• make custom behavior analyzable  

---

# Extension Declaration

Extensions are declared using the `extension` keyword.

Example:

extension invoice_numbering {

  target: create_invoice

  kind: custom_logic

  language: "typescript"

  contract {

    input: invoice

    output: string

  }

  body """
    const prefix = input.issued_at.getFullYear().toString();
    const seq = await db.nextSequence("invoice_number");
    return `INV-${prefix}-${seq.toString().padStart(5, "0")}`;
  """

}

---

# Properties

An extension may contain:

target  
kind  
language  
contract  
body  
description  

---

# Target

The `target` property identifies the workflow or construct the extension attaches to.

Example:

target: create_invoice

---

# Kind

The `kind` property classifies the extension.

Example values may include:

custom_logic  
custom_rendering  
custom_validation  

---

# Contract

The `contract` block defines the extension interface.

Example:

contract {
  input: invoice
  output: string
}

This gives generators a stable interface for integrating handwritten code.

---

# Language

The `language` property specifies the target implementation language for the extension body.

Example:

language: "typescript"

This property is required when a `body` block is present. It guides code generators and enables syntax-aware tooling.

---

# Body

The `body` block contains the inline implementation of the extension, written in the language specified by the `language` property.

The body is a **code literal** delimited by triple double-quotes (`"""`).

Example:

extension invoice_numbering {
  target: create_invoice
  kind: custom_logic
  language: "typescript"

  contract {
    input: invoice
    output: string
  }

  body """
    const prefix = input.issued_at.getFullYear().toString();
    const seq = await db.nextSequence("invoice_number");
    return `INV-${prefix}-${seq.toString().padStart(5, "0")}`;
  """
}

Inside the body, the contract's `input` binding is available as a variable of the declared input type. The body must return a value matching the contract's `output` type.

## Body is optional

When the body is omitted, the extension acts as a seam declaration only. The generated file will contain empty seam markers where custom code can be written directly in the generated output.

When the body is present, its content is emitted into the seam markers during generation.

## Regeneration behavior with body

If the `.prd` file provides a body, that body is the authoritative source. During regeneration:

1. The compiler reads the body from the `.prd` file
2. The body content replaces whatever is between the seam markers
3. Manual edits inside the seam are overwritten

If you need to edit custom code outside the `.prd` file, omit the body and write directly in the generated seam instead.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• extension names are unique  
• targets exist  
• contract types exist  
• if `body` is present, `language` must also be present  

Extensions become nodes in the **Product Graph** and edges connect them to targets.

---

# Seam Preservation During Regeneration

Extensions define the boundaries where handwritten code lives inside generated files. The compiler and generators must preserve these boundaries during regeneration.

## Seam Markers

Generated files must use marker comments to delimit extension seams:

    // --- PRODARA SEAM START: invoice_numbering (platform.extension.invoice_numbering) ---
    // Custom implementation goes here
    // --- PRODARA SEAM END: invoice_numbering ---

The exact comment syntax varies by target language but must include the extension name and the Product Graph node ID.

## Regeneration Behavior

When regenerating a file that contains extension seams:

1. Read the existing file content
2. Extract the content between each matching SEAM START/END pair
3. Generate the new file with empty seam placeholders
4. Reinsert the preserved content
5. Update the artifact manifest with new line numbers

See `compiler/generation.md` for the full generation protocol and `compiler/build-state.md` for the artifact manifest format that tracks seam locations.

## Contract Evolution

If an extension's contract types change (e.g., the input entity gains a new field), the compiler emits a `seam_warning` diagnostic. The handwritten code inside the seam may need manual updating.

The compiler does not modify seam content automatically. It only moves the verbatim content into the regenerated file.

---

# Best Practices

Extensions should be used sparingly and explicitly.

They are escape hatches, not substitutes for product semantics.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `extension_decl`
- `model/product-graph.md` — Extension node type and edges
- `language/v0.1/behavior/workflows.md` — workflows targeted by extensions
- `compiler/generation.md` — generation protocol and seam preservation
- `compiler/build-state.md` — artifact manifest tracking seam locations