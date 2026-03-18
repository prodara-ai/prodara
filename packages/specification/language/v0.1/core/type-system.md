# Prodara Language Specification v0.1
## Type System

This document defines the type system of Prodara v0.1.

The type system determines how fields, workflow inputs and outputs, rules, and references are typed and validated.

Prodara uses a small, explicit, structural type system suitable for deterministic compilation and AI-assisted authoring.

---

# Purpose of the Type System

The type system exists to:

- validate declarations
- prevent invalid references
- support code generation
- support workflow contracts
- enable Product Graph construction

Types must be resolvable at compile time.

---

# Categories of Types

Prodara v0.1 supports the following type categories:

- primitive types
- enum types
- value types
- entity types
- generic wrapper types

---

# Primitive Types

Primitive types are built into the language.

The primitive types of v0.1 are:

    string
    integer
    decimal
    boolean
    uuid
    date
    datetime

These types are globally available and do not require imports.

---

# Primitive Type Semantics

## string
Represents textual data.

## integer
Represents whole numbers.

## decimal
Represents fractional numeric values.

## boolean
Represents true/false values.

## uuid
Represents globally unique identifiers.

## date
Represents calendar dates without time.

## datetime
Represents timestamped date-time values.

---

# Domain Types

Domain types are user-defined types declared in modules.

These include:

- entities
- values
- enums

Examples:

    invoice
    money
    invoice_status
    crm.customer

Domain types are resolved through module namespaces and imports.

---

# Entity Types

An entity type refers to a persistent domain object.

Example:

    customer: crm.customer

Entity types may be used in:

- entity fields
- workflow inputs
- workflow returns
- surface bindings

Entity types carry identity and persistence semantics.

---

# Value Types

A value type refers to an immutable structured data object.

Example:

    total: money

Value types may appear wherever structured data is needed.

They are copied by value conceptually and have no identity.

---

# Enum Types

An enum type refers to a finite set of values.

Example:

    status: invoice_status

Enum values are validated against the defined enum members.

---

# Generic Wrapper Types

Prodara v0.1 supports the following generic wrappers:

    optional<T>
    list<T>

## optional<T>

Represents a value that may be absent.

Example:

    notes: optional<string>

## list<T>

Represents a collection of values of type `T`.

Example:

    items: list<order_item>

Generic wrappers may nest.

Example:

    optional<list<string>>

---

# Type Resolution

Type resolution occurs during semantic analysis.

Resolution rules:

1. primitive types resolve globally
2. local module types resolve within the current module
3. imported symbols resolve through imports
4. fully-qualified symbols resolve through module paths

Examples:

    uuid
    invoice
    crm.customer
    optional<money>

---

# Type Validity

A type expression is valid if:

- the base type exists
- generic wrappers are valid for the inner type
- all referenced symbols resolve unambiguously

Invalid examples:

    optional<>
    unknown_type
    list<missing.symbol>

These produce compilation errors.

---

# Default Values and Types

If a field declares a default value, the default value must be compatible with the field type.

Example:

    status: invoice_status = draft

Valid only if:

- `invoice_status` exists
- `draft` is a valid member of `invoice_status`

Invalid example:

    total: decimal = "free"

because the default type does not match the field type.

---

# Type Compatibility

Prodara v0.1 does not support implicit type coercion.

Examples:

- integer is not automatically decimal
- string is not automatically uuid
- entity is not automatically value

All types must match exactly unless a future language version introduces explicit conversions.

---

# Expression Type Rules

Expressions appear in rule conditions, `decide`/`when` branches, and `valid_when`/`invalid_when` test expectations. The compiler must verify that operand types are compatible with their operators.

## Comparison operators

| Operator     | Allowed left-hand types                | Right-hand must be |
|------------- |----------------------------------------|--------------------|
| `==`, `!=`   | integer, decimal, money, string, date, datetime, uuid, boolean, enum member | Same type as left   |
| `>`, `<`, `>=`, `<=` | integer, decimal, money, date, datetime | Same type as left   |

Entity and value types may not appear as comparison operands. Only their fields may be compared.

## Logical operators

| Operator | Operand types | Result type |
|----------|--------------|-------------|
| `and`    | boolean, boolean | boolean |
| `or`     | boolean, boolean | boolean |
| `not`    | boolean          | boolean |

Comparison expressions produce boolean results and may therefore be combined with logical operators.

## Arithmetic in expressions

Prodara v0.1 does not define arithmetic operators. Expressions are limited to comparisons and logical connectives. Computed values belong to generated implementation, not to the specification language.

## Optional types in expressions

An `optional<T>` field may be compared with `==` or `!=` against `none` (representing absence). All other comparisons require the inner value to be present; the compiler should emit a warning if an optional field is used with `>`, `<`, `>=`, or `<=` without a prior `!= none` guard in the same rule condition.

---

# Workflow Input and Return Types

Workflow inputs and returns use the same type system.

Example:

    input {
      customer: crm.customer
      due_date: date
      notes: optional<string>
    }

    returns {
      ok: invoice
      error: invoice_error
    }

This ensures consistent validation across all language constructs.

---

# Surface Field Types

Form fields and surface field bindings use the same type system.

Example:

    fields {
      customer: crm.customer
      amount: money
      notes: optional<string>
    }

---

# Nullability

Prodara v0.1 models nullability explicitly using `optional<T>`.

There is no implicit nullability.

This rule improves determinism and avoids ambiguous compiler behavior.

---

# Collections

Collections are modeled explicitly using `list<T>`.

There is no implicit array type outside this generic wrapper.

This allows the compiler to reason clearly about multiplicity.

---

# Type Graph

Types become part of the Product Graph.

The compiler creates edges such as:

- entity field -> primitive type
- entity field -> value type
- entity field -> enum type
- workflow input -> entity type
- surface field -> value type

This enables strong validation and generation.

---

# Compiler Responsibilities

During type analysis, the compiler must verify:

- every type reference resolves
- generic wrappers are well-formed
- defaults match field types
- circular value references are valid or rejected according to implementation rules
- entity/value/enum references are semantically valid in context

---

# Future Extensions

Future versions may add:

- map<K,V>
- union types
- literal types
- computed types
- constrained scalar types

These are intentionally excluded from v0.1 to keep the type system small and deterministic.