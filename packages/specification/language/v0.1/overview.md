
# Language Overview

Prodara is a **declarative product specification language**.

It allows teams to define entire software systems using structured specifications.

The language describes:

- domain models (entities, values, enums, rules)
- actors and capabilities
- workflows, actions, events, and schedules
- interaction surfaces and forms
- rendering definitions
- design systems (tokens, themes, localized strings)
- serialization policies
- integrations and platform refinements (transport, storage, execution, extensions)
- cross-product references (product_ref)
- governance (constitutions, security, privacy, validation)
- runtime concerns (secrets, environments, deployments)
- spec-native tests

All constructs exist inside **modules**, which represent bounded domains.

A workspace has exactly one **product** declaration that identifies the product and lists its modules.

Example modules:

    billing
    auth
    crm
    notifications
    design
    platform

Specifications are stored in `.prd` files and compiled into a **Product Graph**.

The Product Graph becomes the canonical semantic model used by the compiler, planner, and code generation system.

---

# Design Goals

The language is designed to:

- remain readable by humans
- be easily generated and understood by AI
- support very large systems with many modules
- allow deterministic compilation
- enable collaborative development through Git
- govern generation through constitutions
- support incremental semantic diffing and regeneration
