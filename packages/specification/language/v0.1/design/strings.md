# Prodara Language Specification v0.1
## Localization: Strings

Strings define **localizable text resources used throughout the product specification**.

They provide a structured mechanism for referencing human-readable text while allowing the product to support multiple languages.

Strings are referenced primarily by:

• surfaces  
• forms  
• renderings  
• validation messages  
• notifications and other user-visible outputs  

Strings are **not intended to replace ordinary documentation text** such as capability titles or internal descriptions. Those remain plain text in the specification.

This keeps the language readable while still supporting proper localization.

---

# Purpose of Strings

Strings exist to:

• support internationalization (i18n)  
• separate user-visible language content from product logic  
• allow translation workflows  
• keep specifications readable and maintainable  

Example problem without strings:

    title: "Invoice List"

Example using string references:

    title: billing.invoice_strings.invoice_list_title

This allows the text to be translated into different languages.

---

# String Declaration

Strings are declared using the `strings` keyword.

Example:

    strings invoice_strings {

      invoice_list_title: "Invoices"

      invoice_number_label: "Invoice #"

      total_label: "Total"

    }

Each entry defines a key and its default text.

---

# String Keys

String keys identify translatable text values.

Syntax:

    key: "text value"

Example:

    invoice_list_title: "Invoices"

Keys should be descriptive and stable.

---

# String Namespacing

Strings exist within module namespaces.

Example reference:

    billing.invoice_strings.invoice_list_title

Structure:

    module.string_set.key

This prevents conflicts across modules.

---

# String Referencing

Strings may be referenced throughout the specification where text is user-visible.

Example surface usage:

    surface invoice_list {

      title: billing.invoice_strings.invoice_list_title

    }

Example rule usage:

    rule invoice_total_positive {

      message: billing.invoice_strings.total_positive

    }

---

# What Should Use Strings

Strings should be used for:

• UI labels  
• titles of surfaces and rendered views  
• button labels  
• validation messages  
• notifications  
• emails  
• API/user-facing error text  

Strings should not normally be used for:

• capability titles  
• internal descriptions  
• documentation-only text  
• code generation metadata  

Those should remain plain text for readability.

---

# String Organization

Strings are grouped into **string sets**.

Example:

    strings invoice_strings {

      invoice_list_title: "Invoices"

      create_invoice_title: "Create Invoice"

      total_label: "Total"

    }

Grouping related strings improves maintainability.

---

# Localization Files

Localization for additional languages may be defined in separate files.

Example file structure:

    modules/billing/i18n/billing.strings.en.prd
    modules/billing/i18n/billing.strings.de.prd
    modules/billing/i18n/billing.strings.fr.prd

Each file overrides string values for a specific language.

Example German localization:

    strings invoice_strings {

      invoice_list_title: "Rechnungen"

      total_label: "Gesamt"

    }

---

# Default Language

The primary specification defines the **default language**.

Additional localization files override these values.

The default language should typically be English.

---

# Dynamic Values

Future versions of the language may support parameterized strings.

Example concept:

    payment_received_message: "Payment of {amount} received"

Parameter substitution would occur at runtime.

Parameterized strings are not part of v0.1.

---

# Naming Conventions

String keys should follow clear naming patterns.

Examples:

invoice_list_title  
create_invoice_button  
payment_success_message  

Avoid vague names such as:

label_1  
message_text  

Clear names improve readability and translation accuracy.

---

# String Evolution

Strings may evolve over time.

Typical changes include:

• adding new strings  
• refining text for clarity  
• expanding localization coverage  

Removing string keys should be done carefully to avoid breaking references.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• string set names are unique within modules  
• string keys are unique within the set  
• referenced string keys exist  
• localization overrides match existing keys  

Strings become nodes in the **Product Graph**.

Surfaces, rules, workflows, and renderings reference these nodes.

---

# Future Extensions

Future versions of the language may introduce:

parameterized strings  
pluralization rules  
gendered language support  
runtime translation selection  

These capabilities are intentionally excluded from v0.1 to keep localization deterministic.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `strings_decl`
- `model/product-graph.md` — StringTable node type and edges
- `language/v0.1/interaction/surfaces.md` — surfaces that reference string keys
- `language/v0.1/domain/rules.md` — rules that reference string keys for messages
