# Changelog

All notable changes to this project will be documented in this file.

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

## [0.1.0] — 2026-03-19

### Added

- **`@prodara/compiler`** — Full compilation pipeline: lexer, parser, binder, type checker, semantic validator, graph builder, graph validator, registry resolver, differ, impact propagator, planner, incremental spec, workflow engine (6 phases), review/fix loop (5 built-in reviewers), verification, audit logging, build state persistence, discovery, configuration
- **`@prodara/cli`** — Global CLI wrapper with local compiler resolution and version compatibility checking. Commands: build, validate, graph, plan, diff, test, init, doctor, watch
- **`@prodara/templates`** — Prompt templates for 6 workflow phases and 5 reviewer agents with platform adapters for Copilot, Claude, Cursor, OpenCode, and Codex
- **`@prodara/lsp`** — Language Server Protocol implementation with bracket validation, keyword completion, and document symbol extraction
- **`@prodara/specification`** — Language specification v0.1, model documentation, example projects, registry definitions
- **`prodara-vscode`** — VS Code extension with TextMate grammar, language configuration, 4 commands, and LSP client integration
- **CI/CD** — GitHub Actions workflows for CI (Node 20/22 matrix), npm releases, and VS Code extension publishing
- **1,096 tests** with 100% coverage across compiler, templates, and LSP packages
