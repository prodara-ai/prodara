# Prodara Language Specification v0.1
## Domain Model: Entities

Entities represent **persistent domain objects** within a product.

Entities form the backbone of the product’s data model. They describe the primary business objects that exist in the system and are typically persisted in storage systems such as relational databases, document stores, or other persistence mechanisms.

Entities are referenced throughout the specification by workflows, surfaces, rules, and APIs.

---

# Purpose of Entities

Entities model objects that:

• have identity  
• exist over time  
• are stored persistently  
• participate in workflows  
• are exposed through surfaces and APIs  

Typical entities include:

user  
invoice  
order  
subscription  
customer  
payment  

Entities represent **core business concepts**.

---

# Entity Declaration

Entities are declared using the `entity` keyword.

Example:

entity invoice {

  invoice_id: uuid

  customer: crm.customer

  total: money

  status: invoice_status

  created_at: datetime

}

Each entity consists of **fields** describing the properties of the object.

---

# Entity Identity

Entities must contain a field representing their unique identity.

In most cases this field is a UUID.

Example:

entity customer {

  customer_id: uuid

  email: string

  created_at: datetime

}

The identity field uniquely identifies instances of the entity.

---

# Field Definitions

Fields describe attributes of an entity.

Syntax:

field_name: type

Example:

entity invoice {

  invoice_id: uuid

  total: decimal

  created_at: datetime

}

Field types may include:

primitive types  
value objects  
enums  
entities  

---

# Primitive Types

Primitive types represent basic values.

Common primitive types include:

string  
integer  
decimal  
boolean  
datetime  
date  
uuid  

Example:

entity user {

  user_id: uuid

  email: string

  active: boolean

}

Primitive types are language-defined and available globally.

---

# Value Object Fields

Entities may contain value objects.

Example:

value money {

  amount: decimal

  currency: string

}

Entity usage:

entity invoice {

  total: money

}

Value objects allow structured data reuse across entities.

---

# Entity Relationships

Entities may reference other entities.

Example:

entity invoice {

  invoice_id: uuid

  customer: crm.customer

}

This creates a relationship between entities.

Relationships are resolved by the compiler and become part of the Product Graph.

---

# Optional Fields

Fields may be declared optional.

Syntax:

optional<type>

Example:

entity invoice {

  invoice_id: uuid

  notes: optional<string>

}

Optional fields may contain null values.

---

# Collection Fields

Entities may contain collections.

Syntax:

list<type>

Example:

entity order {

  order_id: uuid

  items: list<order_item>

}

Collections represent one-to-many relationships.

---

# Default Values

Fields may define default values.

Example:

entity invoice {

  status: invoice_status = draft

}

Default values are applied when new instances are created.

---

# Computed Fields

Future versions of the language may support computed fields.

Example concept:

entity invoice {

  subtotal: decimal

  tax: decimal

  total: computed(subtotal + tax)

}

Computed fields are not part of v0.1 but may appear in later versions.

---

# Entity Usage

Entities are referenced throughout the product specification.

Examples:

workflows read and write entities

surfaces display entities

rules validate entities

APIs expose entities

Example workflow reference:

workflow create_invoice {

  writes {
    invoice
  }

}

---

# Entity Lifecycle

Entities typically follow lifecycle states represented using enums.

Example:

enum invoice_status {

  draft
  sent
  paid
  cancelled

}

Entity fields may reference lifecycle enums.

---

# Entity Best Practices

Entities should represent **business concepts**, not technical structures.

Good examples:

invoice  
customer  
subscription  

Poor examples:

database_record  
api_payload  

Entities should remain cohesive and represent a single concept.

---

# Entity Size Guidelines

Entities should remain relatively small.

Typical entity size:

5–20 fields

If an entity becomes excessively large, it may indicate that:

• the entity should be split  
• some fields belong to value objects  

---

# Persistence

Entities represent objects that are **persisted by the system**.

The actual persistence mechanism is determined by the platform constitution and generation pipeline.

Possible implementations include:

SQL tables  
document databases  
event stores  

The entity specification itself remains storage-agnostic.

---

# Compiler Responsibilities

During compilation, the compiler performs the following checks:

• field names must be unique  
• field types must exist  
• referenced entities must exist  
• default values must match field types  

The compiler then creates entity nodes within the **Product Graph**.

---

# Future Extensions

Future versions of the language may add:

entity indexing rules  
field constraints  
entity inheritance  
entity visibility modifiers  
versioned entities  

These features are intentionally excluded from v0.1 to keep the entity model simple.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `entity_decl`
- `model/product-graph.md` — Entity node type and edges
- `language/v0.1/core/type-system.md` — field type rules
- `language/v0.1/platform/storage.md` — storage mapping for entities
- `language/v0.1/governance/privacy.md` — privacy policies that target entities