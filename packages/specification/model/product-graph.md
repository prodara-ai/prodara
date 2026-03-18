# Prodara Product Graph Specification v0.1

The Product Graph is the canonical semantic representation of a compiled Prodara specification.

All `.prd` files compile into this graph.

The Product Graph is the central artifact used by:

- the compiler
- validators
- planners
- code generators
- language tooling

It is deterministic and complete for the purposes of semantic analysis.

---

# Purpose of the Product Graph

The Product Graph exists to:

- unify all specification files into one semantic model
- make dependencies explicit
- support deterministic generation
- enable validation and analysis
- allow large products to be compiled incrementally

The Product Graph is not source text.  
It is the semantic form of the product.

---

# Graph Model

The Product Graph is a directed labeled graph.

It contains:

- nodes
- edges
- attributes

## Nodes

Nodes represent language constructs. The following node types must be present in a v0.1 Product Graph:

### Product and module structure
- Product (root)
- Module

### Cross-product
- ProductRef

### Domain
- Entity
- Value
- Enum
- Rule

### Product structure
- Actor
- Capability

### Behavior
- Workflow
- Action
- Event
- Schedule

### Interaction
- Surface
- Rendering

### Design system
- TokenSet
- Theme
- StringSet

### Serialization
- Serialization

### Platform
- Integration
- Transport
- Storage
- Execution
- Extension

### Governance
- Constitution
- Security
- Privacy
- Validation

### Runtime
- Secret
- Environment
- Deployment

### Testing
- Test

## Edges

Edges represent semantic relationships such as:

- module contains entity
- workflow reads entity
- workflow writes entity
- workflow uses rule
- workflow triggers on event/schedule
- surface binds entity
- surface references action
- action invokes workflow
- rendering targets surface
- theme extends token set
- security governs surface/workflow
- privacy governs entity
- constitution applies to module
- event emitted by workflow
- environment binds secret
- deployment groups environments

---

# Root Structure

A compiled product graph contains a root product node.

Conceptually:

    Product
      ├─ Module(billing)
      ├─ Module(crm)
      ├─ Module(design)
      └─ Module(platform)

All language constructs are reachable through modules.

---

# Module Nodes

Each module declaration contributes to a single module node.

If a module appears in multiple files, the compiler merges all declarations into the same module node.

Module node responsibilities:

- namespace boundary
- ownership boundary
- dependency scope

Example node:

    Module(name="billing")

---

# Entity Nodes

Each entity becomes an entity node.

Attributes include:

- name
- module
- fields

Field edges connect the entity to referenced types.

Example:

    Entity(name="invoice", module="billing")

Fields may connect to:

- primitive type nodes
- enum nodes
- value nodes
- entity nodes

---

# Enum Nodes

Each enum becomes an enum node.

Attributes include:

- name
- values
- descriptions

Enum values may be represented as child nodes or value attributes, depending on implementation.

---

# Value Nodes

Each value declaration becomes a value node.

Attributes include:

- name
- fields

Field edges connect to other types.

---

# Rule Nodes

Each rule becomes a rule node.

Attributes include:

- name
- condition
- message reference

Edges connect the rule to:

- its target entity
- referenced string keys
- referenced fields if tracked explicitly

---

# Workflow Nodes

Each workflow becomes a workflow node.

Attributes include:

- name
- capability
- authorization policy
- input contract
- return contract

Edges connect the workflow to:

- read entities
- written entities
- rules
- nested workflows
- affected transitions
- effects

Workflow nodes are among the most connected nodes in the graph.

---

# Surface Nodes

Each surface becomes a surface node.

Attributes include:

- name
- kind
- title reference
- binding target

Edges connect the surface to:

- nested surfaces
- actions/workflows
- serialization policies
- bound entities

Surface recursion is represented explicitly in the graph.

---

# Rendering Nodes

Each rendering declaration becomes a rendering node.

Attributes include:

- name
- target surface
- platform
- layout definition
- style definitions

Edges connect the rendering to:

- its target surface
- referenced tokens
- referenced breakpoints
- nested surface placements

---

# Token Set Nodes

Each `tokens` declaration becomes a token set node.

Attributes include:

- name
- categories
- token values

Edges may connect token references from renderings and themes.

---

# Theme Nodes

Each theme becomes a theme node.

Attributes include:

- name
- overrides

Edges connect the theme to:

- the token set it extends
- overridden token paths

---

# Strings Nodes

Each string set becomes a strings node.

Attributes include:

- name
- keys
- values
- language context if localization override files are used

Edges connect string references from:

- surfaces
- workflows
- rules

---

# Serialization Nodes

Each serialization declaration becomes a serialization node.

Attributes include:

- format
- naming policy
- enum policy
- null policy
- date policy

Edges connect serialization nodes to surfaces that reference them.

---

# Actor Nodes

Each actor declaration becomes an actor node.

Attributes include:

- name
- title
- description

Edges connect actors to:

- capabilities that list them
- workflow authorization blocks that reference them

---

# Capability Nodes

Each capability declaration becomes a capability node.

Attributes include:

- name
- title
- description
- actor list

Edges connect capabilities to:

- workflows that reference them
- surfaces that reference them
- actors listed

---

# Action Nodes

Each action declaration becomes an action node.

Attributes include:

- name
- title
- workflow reference

Edges connect actions to:

- the workflow they invoke
- surfaces that list them

---

# Event Nodes

Each event declaration becomes an event node.

Attributes include:

- name
- payload type
- description

Edges connect events to:

- workflows that emit them (via effects)
- workflows that trigger on them (via `on:`)

---

# Schedule Nodes

Each schedule declaration becomes a schedule node.

Attributes include:

- name
- cron expression
- description

Edges connect schedules to:

- workflows that trigger on them (via `on:`)

---

# Integration Nodes

Each integration declaration becomes an integration node.

Attributes include:

- name
- title
- kind
- protocol
- serialization reference

Edges connect integrations to:

- secrets (via auth)
- serialization policies
- workflows or effects that reference them

---

# Transport Nodes

Each transport declaration becomes a transport node.

Attributes include:

- name
- target
- protocol
- style

Edges connect transports to:

- their target surface or integration

---

# Storage Nodes

Each storage declaration becomes a storage node.

Attributes include:

- name
- target entity
- model
- table name
- indexes

Edges connect storage nodes to:

- their target entity

---

# Execution Nodes

Each execution declaration becomes an execution node.

Attributes include:

- name
- target workflow
- mode

Edges connect execution nodes to:

- their target workflow

---

# Extension Nodes

Each extension declaration becomes an extension node.

Attributes include:

- name
- target
- kind
- contract (input/output types)

Edges connect extension nodes to:

- their target workflow or construct
- referenced types in the contract

---

# Constitution Nodes

Each constitution declaration becomes a constitution node.

Attributes include:

- name
- description
- applies_to targets
- package references
- policy blocks

Edges connect constitutions to:

- targeted modules or constructs
- referenced packages

---

# Security Nodes

Each security declaration becomes a security node.

Attributes include:

- name
- applies_to targets
- required properties

Edges connect security nodes to:

- the constructs they govern

---

# Privacy Nodes

Each privacy declaration becomes a privacy node.

Attributes include:

- name
- applies_to targets
- classification
- retention
- redact_on targets
- exportable/erasable flags

Edges connect privacy nodes to:

- the entities or constructs they govern
- surfaces referenced in redact_on

---

# Validation Nodes

Each validation declaration becomes a validation node.

Attributes include:

- name
- applies_to targets
- required validations

Edges connect validation nodes to:

- the constructs they govern

---

# Secret Nodes

Each secret declaration becomes a secret node.

Attributes include:

- name
- description
- source
- env variable name (if applicable)
- path (if applicable)
- scope

Edges connect secrets to:

- integrations that reference them
- environments that bind them

---

# Environment Nodes

Each environment declaration becomes an environment node.

Attributes include:

- name
- url
- description
- secret bindings
- integration overrides

Edges connect environments to:

- secrets they bind
- integrations they override
- deployments that include them

---

# Deployment Nodes

Each deployment declaration becomes a deployment node.

Attributes include:

- name
- description

Edges connect deployments to:

- environments they include

---

# Test Nodes

Each test declaration becomes a test node.

Attributes include:

- name
- target construct
- description
- given state
- expected assertions

Edges connect tests to:

- their target construct
- referenced entities, workflows, or other symbols in given/expect blocks

---

# Product Reference Nodes

Each `product_ref` declaration becomes a product reference node.

Attributes include:

- name
- product identifier
- version constraint
- consumed construct lists
- auth configuration

Edges connect product references to:

- consumed entities, actors, enums, events, surfaces (as external type references)
- secrets (via auth)

Product references introduce cross-product edges that connect local constructs to external Product Graph node identities.

External node identities use the format `@product_name.module.kind.name` to distinguish them from local nodes.

---

# Imports and Symbol Resolution

Imports do not necessarily need to remain as first-class nodes in the final graph, but their effects must be represented in symbol resolution tables.

The graph must preserve enough information to answer:

- where a symbol was declared
- where it is referenced
- which module owns it

This is critical for diagnostics and incremental compilation.

---

# Canonical Edges

The Product Graph must support at least the following edge families:

## Containment
- product contains module
- module contains declaration

## Type Reference
- field references type
- workflow input references type
- workflow return references type
- event payload references type
- extension contract references type

## Dependency
- module depends on module
- workflow calls workflow
- workflow uses rule
- workflow reads entity
- workflow writes entity
- workflow triggers on event or schedule

## Interaction
- surface contains surface
- surface references action
- action invokes workflow
- surface references serialization
- rendering targets surface

## Design
- rendering references token
- theme extends token set
- surface/rule/workflow references string

## Behavior
- workflow emits event
- workflow notifies integration
- workflow audits message

## Platform
- transport refines surface or integration
- storage refines entity
- execution refines workflow
- extension attaches to workflow or construct
- integration references secret
- integration references serialization

## Governance
- constitution applies to module or construct
- security governs surface, workflow, action, or integration
- privacy governs entity or surface
- validation governs module or construct

## Runtime
- environment binds secret
- environment overrides integration
- deployment includes environment
- secret scoped to environment

## Testing
- test targets construct

## Cross-product
- product_ref depends on external product
- product_ref consumes external entity, actor, enum, event, or surface
- workflow triggers on external event (via product_ref)
- field references external entity type (via product_ref)

---

# Determinism

The Product Graph must be deterministic.

Given the same specification set, the compiler must produce the same graph.

Determinism requires:

- stable module merging
- stable symbol resolution
- stable node identity
- stable edge construction

This is essential for reproducible generation and validation.

---

# Node Identity

Each node must have a stable semantic identity.

A node identity should include:

- module name
- declaration kind
- declaration name

Examples:

- billing.entity.invoice
- billing.workflow.create_invoice
- design.tokens.base
- design.theme.dark

Stable identity is necessary for:

- incremental compilation
- diffing
- diagnostics
- code generation mapping

---

# Incremental Compilation

The Product Graph should support incremental updates.

If only one file changes, the compiler should ideally rebuild only the affected module fragments and dependent graph regions.

This requires:

- stable node identities
- explicit dependency edges
- module-level ownership tracking

---

# Validation on the Graph

Many validations should operate on the Product Graph rather than raw source text.

Examples:

- unresolved symbol references
- invalid workflow transitions
- missing token references
- missing string references
- invalid surface bindings
- circular workflow dependencies

This makes validation more robust and implementation-independent.

---

# Product Graph as Compiler Contract

The Product Graph is the primary contract between:

- parser
- semantic analyzer
- planner
- code generator

This means the graph should be rich enough to support all downstream tools without reparsing source text.

---

# Future Extensions

Future versions of the Product Graph may include:

- computed field nodes
- conditional policy evaluation nodes
- generation artifact tracking nodes
- language service index structures
- cross-product workflow orchestration edges

These are not required for v0.1 but should be anticipated in graph design.

---

# See Also

- `model/product-graph-format.md` — concrete JSON serialization format for the Product Graph
- `compiler/compiler-architecture.md` — compiler pipeline that produces the Product Graph
- `compiler/planning-engine.md` — planning engine that diffs Product Graphs
