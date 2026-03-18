# Example: Invoice Generator

This example demonstrates **extensions** — the Prodara construct for defining stable seams where custom code attaches to generated systems. Unlike other constructs that are purely declarative, extensions let you write **inline implementation code** in a target language using the `body` block.

It also shows value objects, workflow authorization, and spec-level tests.

---

## What You'll Learn

| Concept                    | Construct                          | File            |
|----------------------------|------------------------------------|-----------------|
| Extension (custom logic)   | `extension invoice_numbering`      | invoicing.prd   |
| Extension (rendering)      | `extension pdf_renderer`           | invoicing.prd   |
| Contract block             | `contract { input: … output: … }`  | invoicing.prd   |
| Inline code body           | `body """…"""`                     | invoicing.prd   |
| Target language             | `language: "typescript"`           | invoicing.prd   |
| Extension target           | `target: create_invoice`           | invoicing.prd   |
| Extension kind             | `kind: custom_logic`               | invoicing.prd   |
| Value object               | `value line_item`                  | invoicing.prd   |
| Workflow with extensions   | `workflow create_invoice`          | invoicing.prd   |
| Execution mode             | `execution invoice_creation`       | platform.prd    |
| Storage with indexes       | `storage invoice_storage`          | platform.prd    |

---

## Product Structure

    product invoice_gen {
      title: "Invoice Generator"
      version: "0.1.0"
      modules: [invoicing, platform]
    }

- `invoicing` — domain model, workflow, extensions, tests
- `platform` — execution, storage, serialization

---

## Key Patterns

### Extension with contract and body

An extension declares a named seam that attaches to a workflow. The `contract` block defines the types flowing in and out. The `body` block provides the inline implementation:

    extension invoice_numbering {
      target: create_invoice
      kind: custom_logic
      language: "typescript"
      description: "Generates a sequential invoice number"

      contract {
        input: invoice
        output: string
      }

      body """
        const year = input.issued_at
          ? input.issued_at.getFullYear()
          : new Date().getFullYear();
        const seq = await db.nextSequence("invoice_number");
        return `INV-${year}-${seq.toString().padStart(5, "0")}`;
      """
    }

Inside the body, `input` is bound to the contract's input type. The body must return a value matching the contract's output type.

### Body is optional

If you omit the body, the extension is a **seam declaration only**. The compiler emits empty seam markers in the generated file where you write custom code directly:

    // --- PRODARA SEAM START: invoice_numbering ---
    //   your handwritten code here
    // --- PRODARA SEAM END: invoice_numbering ---

When the body is present, the compiler fills the seam with the body content. The `.prd` file is the authoritative source — manual edits in the generated seam are overwritten on regeneration.

### Multiple extensions on one workflow

A single workflow can have more than one extension. This example attaches both `invoice_numbering` (custom_logic) and `pdf_renderer` (custom_rendering) to `create_invoice`.

### Value objects

Value objects are immutable data structures. They are ideal for line items that are created once and never modified independently:

    value line_item {
      description: string
      quantity: integer
      unit_price: decimal
    }
