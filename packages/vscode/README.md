# Prodara for VS Code

Language support for Prodara `.prd` specification files in Visual Studio Code.

## Features

- **Syntax Highlighting** — Full TextMate grammar covering keywords, types, strings, comments, operators, and identifiers
- **Bracket Matching** — Auto-closing pairs for `{}`, `[]`, `()`
- **Comment Toggling** — Toggle line comments with `Cmd+/` / `Ctrl+/`
- **Folding** — Code folding on brace-delimited blocks
- **Diagnostics** — Real-time bracket/brace validation via LSP
- **Completions** — Keyword and type name completion
- **Document Symbols** — Outline view of declarations (product, module, entity, workflow, etc.)
- **Commands**:
  - `Prodara: Build` — Run full build pipeline
  - `Prodara: Validate` — Validate specifications
  - `Prodara: Show Product Graph` — Display the Product Graph
  - `Prodara: Show Plan` — Display the incremental plan

## Requirements

- VS Code ≥ 1.85.0
- Node.js ≥ 20
- `@prodara/compiler` installed in your project

## Installation

Install from the VS Code Marketplace (search "Prodara") or build from source:

```bash
cd packages/vscode
npm run build
npx @vscode/vsce package
```

## License

Apache-2.0
