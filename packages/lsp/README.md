# @prodara/lsp

Language Server Protocol implementation for Prodara `.prd` specification files. Provides real-time diagnostics, keyword completion, and document symbols.

## Installation

```bash
npm install @prodara/lsp
```

## Capabilities

- **Diagnostics** — Real-time bracket/brace matching with debounced validation (300ms)
- **Completions** — All PRD keywords and type names with trigger characters `.` and `:`
- **Document Symbols** — Outline view of product, module, entity, workflow, and other block declarations

## Architecture

The server is split into two layers:

- **`analysis.ts`** — Pure functions (`validateText`, `extractSymbols`, `declKindToSymbolKind`) with no connection dependency. Fully testable.
- **`server.ts`** — LSP connection wiring, document management, and debounced diagnostics.

### Module Cache

An LRU cache (`ModuleCache`) stores parsed module results keyed by document URI. Configurable max size (default: 200 entries). Least-recently-used entries are evicted when the cache exceeds capacity.

## Usage with VS Code

The `prodara-vscode` extension starts this server automatically. See [`packages/vscode/`](../vscode/) for the extension.

## Testing

```bash
npm test              # 38 tests
npm run test:coverage # Enforces 100% coverage
```

## License

MIT
