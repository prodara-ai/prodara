# Prodara Project Instructions

This is a **Prodara** project — an AI-native product specification ecosystem.

## How This Project Works

Product specifications are written in `.prd` files using the Prodara specification language. The Prodara compiler validates these specs through a 13-phase pipeline and produces a deterministic Product Graph that drives code generation.

## Primary Workflow

The recommended workflow for building with Prodara is:

1. **Initialize** — `prodara init --template <template>` sets up the project
2. **Write specs** — Edit `.prd` files (or let the AI agent write them)
3. **Build** — `prodara build .` validates, compiles, and generates implementation tasks
4. **Implement** — Write the code files from the generated implementation tasks
5. **Iterate** — Change specs, rebuild, and see exactly what changed via semantic diffing

## Key Facts

- `.prd` files are the single source of truth for the product definition
- The compiler catches errors before code is written (900+ diagnostic codes with suggested fixes)
- Same spec always produces the same Product Graph (SHA-256 verified determinism)
- 9 built-in reviewers catch architecture, security, and quality issues
- Use `--dry-run` to preview implementation tasks before executing
- Use `--headless` to send prompts directly to AI providers via API

## Agent Prompts

Use the `@prodara` prompt (`.github/prompts/prodara.prompt.md`) for the primary build workflow — just type `@prodara` followed by what you want to build. Run `prodara init --ai copilot` to generate all 29 additional slash command prompts.
