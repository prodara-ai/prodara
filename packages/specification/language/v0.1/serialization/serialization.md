# Prodara Language Specification v0.1
## Serialization

Serialization policies define **how domain data is encoded when transmitted across system boundaries**.

Serialization is primarily used for:

• API responses  
• API requests  
• integration messages  
• export formats  

Serialization policies ensure consistent encoding across the entire product.

Instead of embedding serialization rules inside every API surface, policies are defined once and referenced where needed.

---

# Purpose of Serialization

Serialization policies exist to:

• standardize API output formats  
• ensure consistency across services  
• simplify integration behavior  
• enable configurable encoding strategies  

Without serialization policies, APIs would produce inconsistent responses.

Example problem without serialization policy:

{ “createdAt”: “2024-01-01” }

versus

{ “created_at”: “2024-01-01” }

Serialization policies define the rules that remove such ambiguity.

---

# Serialization Declaration

Serialization policies are declared using the `serialization` keyword.

Example:

serialization default {

format: json

naming: snake_case

dates: iso8601

enums: string

nulls: omit

}

This defines a reusable serialization policy named `default`.

---

# Serialization Properties

Serialization policies may define the following properties.

format  
naming  
dates  
enums  
nulls  

Not all properties are required.

---

# Format

The `format` property defines the data encoding format.

Example:

format: json

Common formats include:

json  
xml  
yaml  

JSON is expected to be the most common format.

---

# Naming Convention

The `naming` property defines how field names are encoded.

Example:

naming: snake_case

Possible values include:

snake_case  
camelCase  
PascalCase  

Example entity:

created_at

With camelCase serialization:

createdAt

---

# Date Encoding

The `dates` property defines how date and datetime values are encoded.

Example:

dates: iso8601

Common options include:

iso8601  
timestamp  

ISO 8601 is recommended because it is widely supported.

---

# Enum Encoding

The `enums` property defines how enum values are serialized.

Example:

enums: string

Possible values include:

string  
numeric  

Example enum:

invoice_status.sent

Serialized as string:

“sent”

---

# Null Handling

The `nulls` property defines how null values are handled.

Example:

nulls: omit

Possible options include:

omit  
explicit  

Example with `omit`:

{
“invoice_id”: “123”
}

Example with `explicit`:

{
“invoice_id”: “123”,
“notes”: null
}

---

# Referencing Serialization Policies

Surfaces may reference serialization policies.

Example API surface:

surface invoice_api {

kind: api

binds: invoice

serialization: platform.default

}

This instructs the API surface to use the `default` serialization rules.

---

# Module Organization

Serialization policies are typically defined in infrastructure or platform modules.

Example:

module platform {

serialization default {

format: json

naming: snake_case

dates: iso8601

}

}

This allows all modules to reference a consistent policy.

---

# API Consistency

Using serialization policies ensures that all APIs:

• follow consistent naming conventions  
• encode data uniformly  
• handle null values consistently  

This greatly simplifies integration with external systems.

---

# Compiler Validation

During compilation the compiler verifies:

• serialization policy names are unique within a module  
• referenced serialization policies exist  
• property values are valid  

Serialization policies become nodes in the **Product Graph**.

API surfaces create edges referencing the policy they use.

---

# Best Practices

Serialization policies should remain stable.

Changing a policy may affect many APIs simultaneously.

Recommended practices:

• define policies early  
• reuse policies consistently  
• avoid unnecessary variation  

---

# Future Extensions

Future versions of the language may support additional serialization capabilities.

Potential extensions include:

field-level serialization rules  
conditional serialization  
custom encoders  
versioned serialization policies  

These capabilities are excluded from v0.1 to keep serialization deterministic and predictable.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `serialization_decl`
- `model/product-graph.md` — Serialization node type and edges
- `language/v0.1/interaction/surfaces.md` — surfaces referencing serialization policies