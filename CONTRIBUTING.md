# Contributing to Prodara

Thank you for your interest in contributing to Prodara! This document explains how to get started, our development workflow, and the standards we expect.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/prodara-ai/prodara.git
cd prodara

# Install dependencies (npm workspaces)
npm install

# Verify everything works
npm run typecheck
npm test
```

**Requirements:** Node.js ≥ 20

## Project Structure

This is an npm workspaces monorepo with 6 packages:

| Package | Path | Description |
|---------|------|-------------|
| `@prodara/compiler` | `packages/compiler/` | Compiler core, workflow engine, reviewer agents |
| `@prodara/cli` | `packages/cli/` | Thin global CLI wrapper |
| `@prodara/templates` | `packages/templates/` | Prompt templates for AI platforms |
| `@prodara/lsp` | `packages/lsp/` | Language Server Protocol implementation |
| `@prodara/specification` | `packages/specification/` | Language specification and examples |
| `prodara-vscode` | `packages/vscode/` | VS Code extension |

## Development Workflow

### Branching

- `main` — stable, always passes CI
- Feature branches: `feat/<description>`
- Bug fixes: `fix/<description>`

### Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run typecheck` — must pass with zero errors
4. Run `npm test` — all tests must pass
5. If you changed compiler code, verify 100% coverage: `npm run test:coverage`
6. Commit using [Conventional Commits](https://www.conventionalcommits.org/): e.g., `feat(compiler): add new keyword`, `fix(lsp): handle empty files`
7. Open a pull request against `main`

### Quality Standards

- **100% test coverage** on `@prodara/compiler`, `@prodara/templates`, and `@prodara/lsp`
- **Zero TypeScript errors** across all packages (`npm run typecheck`)
- **JSDoc on all exported functions** in public API modules
- **No `any` types** in source code
- **Strict TypeScript** configuration enforced

### Adding Changesets

We use [changesets](https://github.com/changesets/changesets) for versioning. After making a user-facing change:

```bash
npx changeset
```

Follow the prompts to describe your change and select the affected packages.

## Testing

```bash
# Run all tests
npm test

# Run with coverage enforcement
npm run test:coverage

# Run a specific package's tests
npm run test --workspace=packages/compiler

# Type-check all packages
npm run typecheck
```

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- ESM modules (`"type": "module"` in package.json)
- Prefer `const` over `let`
- Use explicit return types on exported functions
- Use `readonly` for interface properties that should not be mutated

## Reporting Issues

Use [GitHub Issues](https://github.com/prodara-ai/prodara/issues) with one of:
- **Bug report** — include reproduction steps, expected vs actual behavior
- **Feature request** — describe the use case and proposed solution

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
