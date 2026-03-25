
# Prodara Specification

This repository contains the **canonical specification for the Prodara language**.

Prodara is a **Git-native, AI-native, spec-first programming language for products**.

Instead of writing large amounts of application code, developers describe the product as a **structured specification** — either by hand or by telling an AI agent what to build via a single `/prodara` command. The AI writes the `.prd` specification and generates production-ready code from it.

The specification describes:

- domain models (entities, values, enums, rules)
- actors and capabilities
- workflows, actions, events, and schedules
- interaction surfaces, forms, and rendering
- design systems (tokens, themes, localized strings)
- serialization policies
- integrations and platform refinements (transport, storage, execution, extensions)
- governance (constitutions, security, privacy, validation)
- runtime concerns (secrets, environments, deployments)
- spec-native tests

All specifications compile into a **Product Graph**, which becomes the semantic representation of the product used for generation and validation.

---

# Repository Structure

language/v0.1/
: Language specification (grammar, lexical structure, syntax conventions, and all construct definitions)

model/
: Product Graph semantic model and concrete IR format

compiler/
: Compiler architecture, compilation phases, diagnostics, planning engine, build state, graph slicing, generation protocol, verification, language service, and spec testing

registry/
: Registry package format, resolution protocol, and AI generation instructions (AGENTS.md / SKILL.md)

runtime/
: Deployment targets, environment resolution, and secret resolution

testing/
: Conformance suite and compiler fixtures

examples/
: Example product specifications

---

# Philosophy

Prodara follows several core principles.

Specification First  
The specification is the single source of truth.

AI Native  
The language structure is optimized for AI-assisted development.

Git Native  
Specifications are versioned and collaborative.

Deterministic  
Specifications compile into a deterministic semantic model.

Extensible  
The language evolves via proposals without breaking existing specifications.
