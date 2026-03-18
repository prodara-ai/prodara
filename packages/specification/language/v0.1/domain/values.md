# Prodara Language Specification v0.1
## Domain Model: Values

Values represent **immutable structured data types**.

They are used to model small, reusable data structures that do not have identity and are not persisted independently.

Values are sometimes referred to as **value objects** in domain-driven design.

Examples include:

money  
address  
coordinate  
duration  
percentage  

Values are embedded inside entities or passed between workflows.

---

# Purpose of Values

Values represent data structures that:

• do not have identity  
• are immutable  
• exist only as part of other objects  
• are reused across multiple entities  

For example, a monetary value consists of an amount and a currency.

Example:

value money {

  amount: decimal

  currency: string

}

Values allow domain concepts to be modeled precisely while keeping entities smaller and more reusable.

---

# Value Declaration

Values are declared using the `value` keyword.

Example:

value money {

  amount: decimal

  currency: string

}

A value contains a set of fields similar to an entity.

However, unlike entities, values do not have identity fields.

---

# Value Fields

Fields within a value follow the same syntax as entity fields.

Syntax:

field_name: type

Example:

value address {

  street: string

  city: string

  postal_code: string

  country: string

}

Fields may use:

primitive types  
other values  
enums  

Values should not reference entities.

---

# Nested Values

Values may contain other values.

Example:

value coordinate {

  latitude: decimal

  longitude: decimal

}

value location {

  name: string

  coordinate: coordinate

}

Nested values allow complex structures to be composed from smaller parts.

---

# Using Values in Entities

Values are commonly used as fields in entities.

Example:

entity invoice {

  invoice_id: uuid

  total: money

  billing_address: address

}

This embeds the value inside the entity.

---

# Using Values in Workflows

Values may appear in workflow inputs and outputs.

Example:

workflow calculate_tax {

  input {

    amount: money

  }

  returns {

    ok: money

  }

}

Values allow workflows to operate on structured domain data.

---

# Optional Values

Values may be optional using the optional type wrapper.

Example:

entity order {

  order_id: uuid

  shipping_address: optional<address>

}

Optional values may be absent.

---

# Collections of Values

Values may appear in collections.

Example:

entity order {

  order_id: uuid

  items: list<order_item>

}

Where order_item is a value type.

---

# Immutability

Values are considered **immutable structures**.

Once created, their fields should not change independently.

If a value changes, a new value instance should be created.

This property simplifies reasoning about domain logic and workflows.

---

# Value Equality

Values are considered equal when all fields are equal.

Example:

money { amount: 100, currency: "USD" }

is equal to

money { amount: 100, currency: "USD" }

This differs from entities, which are compared using identity fields.

---

# Value Best Practices

Values should represent **small reusable concepts**.

Examples of good values:

money  
address  
coordinate  
percentage  

Examples of poor values:

user_profile  
invoice_record  

Large domain objects should be entities rather than values.

---

# Size Guidelines

Values should remain small.

Typical size:

2–6 fields

Large structures may indicate that the value should instead be an entity.

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• value names are unique within a module  
• field names are unique within the value  
• referenced types exist  
• values do not create invalid dependency cycles  

The compiler then creates value nodes in the **Product Graph**.

---

# Future Extensions

Future versions of the language may allow values to define:

validation constraints  
computed fields  
serialization hints  

These features are intentionally excluded from v0.1 to keep the value model minimal and predictable.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `value_decl`
- `model/product-graph.md` — Value node type and edges
- `language/v0.1/core/type-system.md` — value as composite type