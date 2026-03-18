# Prodara Language Specification v0.1
## Lexical Structure

This document defines the lexical structure of the Prodara language.

Lexical structure describes how raw source text is divided into tokens before syntactic parsing begins.

The lexer is responsible for recognizing:

- identifiers
- keywords
- literals
- punctuation
- comments
- whitespace

The lexer must operate deterministically.

---

# Source Text

Prodara source files are UTF-8 encoded text files.

A source file consists of a sequence of Unicode code points.

The language specification does not require normalization of Unicode input. Tooling may preserve original source text exactly for diagnostics and formatting.

---

# Whitespace

Whitespace separates tokens but otherwise has no semantic meaning, except inside string literals.

Whitespace characters include:

- space
- tab
- carriage return
- line feed

Whitespace may appear freely between tokens unless it would split a token.

Example:

    entity invoice {
      invoice_id: uuid
    }

is lexically equivalent to:

    entity   invoice{invoice_id:uuid}

provided token boundaries remain valid.

---

# Newlines

Newlines do not terminate statements.

Prodara is a brace-delimited language.

Line breaks are significant only for:

- diagnostics
- formatting
- tooling
- comment termination

---

# Comments

Prodara supports line comments and block comments.

## Line comments

A line comment begins with `//` and continues until the end of the line.

Example:

    // This entity represents an invoice
    entity invoice {
      invoice_id: uuid
    }

## Block comments

A block comment begins with `/*` and ends with `*/`.

Example:

    /*
      Invoice lifecycle states
    */
    enum invoice_status {
      draft
      sent
    }

Block comments do not nest in v0.1.

Comments are ignored by the parser except where preserved for tooling or documentation generation.

---

# Identifiers

Identifiers name modules, symbols, fields, enum values, token sets, and other declarations.

## Identifier syntax

An identifier must match:

    identifier =
      identifier_start identifier_continue*

where:

    identifier_start =
      ASCII letter | "_"

    identifier_continue =
      ASCII letter | digit | "_"

Examples of valid identifiers:

    billing
    invoice
    invoice_status
    create_invoice
    _internal

Examples of invalid identifiers:

    123invoice
    invoice-status
    invoice status

---

# Qualified Names

Qualified names reference symbols across namespaces.

A qualified name is a sequence of identifiers separated by dots.

Syntax:

    qualified_name =
      identifier ("." identifier)*

Examples:

    billing.invoice
    crm.customer
    design.base.color.brand_primary

Qualified names are resolved semantically, not lexically.

---

# Keywords

The following are reserved keywords in Prodara v0.1.

Keywords are grouped by the language area they primarily belong to, but all keywords share a single flat namespace and none may be used as identifiers.

## Product and module system

    product
    module
    import
    from
    as
    product_ref
    publishes
    consumes

## Domain modeling

    entity
    enum
    value
    rule
    condition
    message

## Expressions

    and
    or
    not

## Product structure

    actor
    capability
    actors

## Behavior

    workflow
    action
    authorization
    input
    reads
    writes
    rules
    steps
    transitions
    effects
    returns
    call
    decide
    when
    fail
    on

## Events and schedules

    event
    payload
    schedule
    cron
    emit

## Interaction

    surface
    kind
    binds
    actions
    title
    description
    hooks
    fields
    serialization

## Rendering

    rendering
    target
    platform
    layout
    grid
    placement
    style
    bind
    components
    at
    columns
    rows
    gap
    row
    column
    auto

## Design system

    tokens
    theme
    extends
    strings

## Governance

    constitution
    use
    policies
    applies_to
    security
    requires
    privacy
    classification
    retention
    redact_on
    exportable
    erasable
    validation

## Platform

    integration
    protocol
    auth
    transport
    storage
    model
    table
    indexes
    execution
    mode
    extension
    contract
    body
    language
    unique

## Runtime

    secret
    source
    env
    path
    scope
    environment
    url
    secrets
    integrations
    environments
    deployment

## Testing

    test
    given
    expect

## Effects

    audit
    notify

## Product metadata

    version
    modules

All keywords listed above are reserved. They may not be used as identifiers.

---

# Literals

Prodara v0.1 supports the following literal forms:

- string literals
- integer literals
- decimal literals
- boolean literals

## String literals

String literals are enclosed in double quotes.

Example:

    "Invoices"
    "Invoice created"
    "2024-01-01"

String literals may contain any character except an unescaped double quote or newline.

Supported escape sequences in v0.1:

    \"
    \\
    \n
    \t

## Integer literals

Integer literals are sequences of digits.

Examples:

    0
    4
    12
    1024

## Decimal literals

Decimal literals contain digits, a decimal point, and digits.

Examples:

    1.0
    12.50
    0.25

## Boolean literals

Boolean literals are:

    true
    false

## Code literals

Code literals are delimited by triple double-quotes (`"""`).

They capture arbitrary text verbatim, including newlines and special characters.

Example:

    """
    const prefix = input.issued_at.getFullYear().toString();
    const seq = await db.nextSequence("invoice_number");
    return `INV-${prefix}-${seq.toString().padStart(5, "0")}`;
    """

The opening `"""` must be followed by a newline. The closing `"""` must appear on its own line.

The lexer strips the common leading whitespace from all lines (dedent), preserving the relative indentation of the code.

Code literals are used in extension `body` blocks to embed target-language implementations.

---

## Dimension literals

Dimension literals are numeric values followed by a unit suffix with no separating whitespace.

Examples:

    1fr
    240px

The lexer tokenizes these as a single token consisting of a numeric part and an identifier suffix.

Dimension literals are used in rendering grid definitions.

Valid dimension suffixes in v0.1:

    fr

Additional suffixes may be defined in future versions.

---

# Punctuation and Delimiters

The following punctuation tokens are recognized:

    { } ( ) [ ]
    : , . =
    < >
    ->
    ..
    @
    /
    /* */
    //

Examples:

- braces delimit blocks
- brackets delimit lists
- colon separates keys and values
- angle brackets delimit generic type forms such as `optional<string>`
- arrow is used in decisions and transitions
- `..` is used in range expressions (e.g., `1..3`)
- `@` separates package path from version in constitution `use` references
- `/` separates path segments in constitution package paths

---

# Comparison Operators

Prodara v0.1 supports a small set of comparison operators used in rule conditions:

    >
    <
    >=
    <=
    ==
    !=

These operators are tokenized as punctuation and are valid only in expression contexts (see grammar.md).

---

# Lists

Lists are enclosed in square brackets.

Example:

    actions: [
      create_invoice,
      open_invoice
    ]

Comma separators are required between list elements.

Trailing commas may be allowed by implementations, but v0.1 does not require them.

---

# Generic Type Forms

Prodara supports generic type wrappers in lexical form.

Examples:

    optional<string>
    list<invoice>
    optional<money>

The lexer tokenizes these as:

- identifier
- `<`
- identifier or qualified_name
- `>`

Generic type validity is checked semantically.

---

# Dot Paths vs Decimal Numbers

A decimal literal such as:

    12.5

must be lexed as a decimal literal.

A qualified name such as:

    billing.invoice

must be lexed as identifiers separated by dot punctuation.

The lexer must distinguish these forms deterministically.

---

# Error Handling

Lexical errors include:

- unterminated string literal
- unterminated block comment
- invalid identifier start
- invalid character
- malformed numeric literal

A lexer encountering an error must report:

- file
- line
- column
- offending lexeme
- error category

---

# Formatting Expectations

Although whitespace is not semantically significant, the language is designed for canonical formatting.

A formatter should preserve:

- comments
- block structure
- token meaning

The formatter may normalize:

- indentation
- spacing
- line wrapping

---

# Future Extensions

Future versions of the language may add:

- numeric separators
- Unicode identifiers
- nested block comments

These features are excluded from v0.1 to keep lexical analysis simple and deterministic.