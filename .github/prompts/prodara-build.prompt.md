---
mode: agent
description: "Build a product with Prodara — validate, compile, and implement .prd specs"
---

# Prodara Build

You are working in a **Prodara** project — a specification-driven product engineering system. Your primary workflow is:

1. **Understand** — Read the `.prd` spec files in the project to understand the product definition
2. **Validate** — Run `prodara validate .` to type-check and catch errors
3. **Build** — Run `prodara build .` to execute the full 13-phase compilation pipeline
4. **Implement** — The build generates implementation tasks; write the code files as described
5. **Verify** — Run `prodara test .` to run spec-level tests against the Product Graph

## Key Commands

```bash
prodara build .                # Full pipeline: validate → graph → plan → implement → review → verify
prodara build --dry-run        # Preview implementation tasks without executing
prodara build --headless       # Send prompts directly to AI provider via API
prodara build --no-implement   # Skip implementation phase (validate + plan only)
prodara validate .             # Type-check .prd files only
prodara graph -o graph.json .  # Emit the Product Graph as JSON
prodara plan --format json .   # Generate the incremental plan
prodara test .                 # Run spec-level tests
prodara diff .                 # Show semantic changes since last build
prodara review .               # Run the 9-reviewer pipeline
```

## The .prd Language

Specs use a declarative syntax with 31 declaration types:

- **Domain**: entity, value, enum, rule, actor, capability
- **Behavior**: workflow, action, event, schedule
- **Surface**: surface, rendering, tokens, theme, strings
- **Infrastructure**: integration, transport, storage, execution, serialization
- **Governance**: constitution, security, privacy, validation
- **Testing**: test blocks with expect assertions

## Build Output

The compiler produces:

- **Product Graph** — Typed nodes and 42 edge types (JSON)
- **Incremental Plan** — Exactly what changed and what needs regenerating
- **Implementation Tasks** — Structured prompts for each code artifact
- **Review Results** — Feedback from 9 built-in reviewers

## Workflow

When the user asks you to build or work on a Prodara project:

1. Read the `.prd` files to understand the current spec
2. If changes are needed, edit the `.prd` files directly
3. Run `prodara validate .` to check for errors
4. If errors exist, fix them (the compiler provides suggested fixes)
5. Run `prodara build .` to generate the full build output
6. Implement the generated tasks by writing the code files
7. Run `prodara test .` to verify everything passes

## Error Handling

The compiler produces 900+ diagnostic codes with source locations and suggested fixes. When you encounter errors:

- Read the diagnostic message and suggested fix
- Apply the fix to the `.prd` file
- Re-validate until clean

## Configuration

Project settings live in `prodara.config.json`. Key options:

- `reviewers` — Enable/disable specific reviewers
- `agent.maxImplementRetries` — Retry count for validate-after-implement loops
- `constitution.path` — Path to governance constitution file
- `validation` — External validation commands (lint, test, build)
