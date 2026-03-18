# Prodara Language Specification v0.1
## Transport

Transport declarations define **delivery-mechanism refinements** for surfaces or integrations.

Transport is not the source of interaction semantics.  
Surfaces and integrations remain the semantic source of truth.  
Transport specifies how they are exposed or communicated.

---

# Purpose of Transport

Transport exists to:

• refine protocols  
• keep semantics separate from delivery  
• support multiple communication styles  
• guide generation  

---

# Transport Declaration

Transport is declared using the `transport` keyword.

Example:

transport invoice_api_transport {

  target: invoice_api

  protocol: http

  style: rest

}

---

# Properties

A transport declaration may contain:

target  
protocol  
style  
description  

---

# Target

The `target` property identifies the surface or integration being refined.

Example:

target: invoice_api

---

# Protocol

The `protocol` property defines the communication mechanism.

Examples:

http  
grpc  
messaging  
websocket  

---

# Style

The `style` property refines the protocol usage.

Examples:

rest  
rpc  
pubsub  

---

# Compiler Responsibilities

During compilation, the compiler verifies:

• transport names are unique  
• targets exist  
• protocol/style values are valid syntactically  

Transport declarations become nodes or refinements in the **Product Graph**.

---

## See Also

- `language/v0.1/grammar.md` — formal syntax for `transport_decl`
- `model/product-graph.md` — Transport node type and edges
- `language/v0.1/platform/integrations.md` — integrations refined by transport