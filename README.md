<p align="center">
  <a href="https://www.prodara.net" target="blank"><img src="assets/logo/logo-vertical.png" width="320" alt="Prodara Logo" /></a>
</p>

<p align="center">Give your AI a compiler, not a pile of markdown.<br/>Prodara compiles <code>.prd</code> specs into a typed Product Graph. Change a spec and the compiler tells your agent exactly what's impacted.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@prodara/cli"><img src="https://img.shields.io/npm/v/@prodara/cli.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@prodara/cli"><img src="https://img.shields.io/npm/l/@prodara/cli.svg" alt="License" /></a>
  <a href="https://github.com/prodara-ai/prodara/actions"><img src="https://github.com/prodara-ai/prodara/workflows/CI/badge.svg" alt="CI Status" /></a>
  <a href="https://www.prodara.net"><img src="https://img.shields.io/badge/docs-www.prodara.net-blue" alt="Documentation" /></a>
</p>

---

## What Is Prodara?

Prodara is a **compiler for product specifications**. You write `.prd` files that describe your product — entities, workflows, screens, permissions, governance — and the compiler validates them through a 13-phase pipeline. When a spec changes, semantic diffing tells your AI agent exactly what's impacted, so it builds from a verified plan instead of scanning your entire codebase.

Under the hood, Prodara uses a structured specification language (`.prd` files) as an intermediate representation. The AI generates these specs from your description, the compiler validates them through a 13-phase pipeline, and the resulting Product Graph drives structured, incremental code generation.

**One command does it all**:

```
prodara init → /prodara "Build a SaaS billing system" → production-ready code
```

## Quick Start

```bash
# Install the global CLI
npm install -g @prodara/cli

# Initialize a project (auto-installs compiler + generates AI agent prompt)
prodara init my-product
cd my-product

# Open in VS Code and use the /prodara command:
code .

# In your AI agent's chat, type:
#   /prodara Build a task management app with teams, projects, and real-time updates

# Or run the build pipeline directly:
prodara build
```

> `prodara init` runs `npm init` (if needed), installs `@prodara/compiler` as a dev dependency, and generates the AI agent prompt file. Use `--ai <agent>` to target a specific platform (copilot, claude, cursor, gemini, and 22 more).

## How It Works

```
You describe what you want
        │
        ▼
┌──────────────────┐
│  /prodara command │  Your AI agent (Copilot, Claude, Cursor, etc.)
└──────────────────┘
        │
        ▼
┌──────────────────┐  Phase 1: Clarify ambiguities (only pause point)
│   Clarify        │  Phase 2: Generate .prd specification files
│   Specify        │  Phase 3: Validate specs (prodara validate + multi-perspective review)
│   Build          │  Phase 4: Compile → Product Graph → Implementation Plan
│   Govern         │  Phase 5: Generate governance files (agents.md)
│   Implement      │  Phase 6: Write production code (every file, every function)
│   Review         │  Phase 7: Multi-perspective review + auto-fix loop
│   Deliver        │  Phase 8: Final validation + summary
└──────────────────┘
        │
        ▼
  Production-ready application
```

The AI agent executes all 8 phases autonomously. It only pauses to ask clarification questions when genuinely ambiguous — everything else runs end-to-end without user intervention.

## Table of Contents

- [What Is Prodara?](#what-is-prodara)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Features](#features)
- [The .prd Language](#the-prd-language)
- [Compilation Pipeline](#compilation-pipeline)
- [CLI Commands](#cli-commands)
- [AI Agent Integration](#ai-agent-integration)
- [VS Code Extension](#vs-code-extension)
- [Programmatic API](#programmatic-api)
- [Packages](#packages)
- [Configuration](#configuration)
- [Testing](#testing)
- [Development](#development)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Features

### End-to-End AI Orchestration
- **Single command** — `/prodara <description>` drives the entire lifecycle
- **8-phase workflow** — Clarify → Specify → Validate → Build → Govern → Implement → Review → Deliver
- **26 supported AI platforms** — Copilot, Claude, Cursor, Gemini, Windsurf, Codex, Kiro, Jules, Amp, Roo, Aider, Cline, Continue, Zed, Bolt, Aide, Trae, Augment, Sourcegraph, TabNine, Supermaven, Void, PearAI, Double, OpenCode, and a generic adapter
- **Autonomous execution** — Only pauses for genuinely ambiguous clarifications
- **Multi-perspective review** — Architecture, security, code quality, test quality, UX, and spec compliance reviewers with auto-fix loop

### Specification Language
- **31 declaration types** — entity, workflow, surface, action, event, rule, actor, capability, enum, value object, integration, transport, storage, and more
- **Constitution & governance** — Encode security policies, privacy rules, and architectural constraints at the spec level
- **Specification tests** — Validate transitions, authorization, and invariants directly in `.prd` files
- **AI-generated** — Users describe in natural language; the AI translates to `.prd` files

### Compiler
- **13-phase compilation pipeline** — Lexer → Parser → Binder → Checker → Validator → Graph Builder → Graph Validator → Registry → Differ → Impact Propagation → Planner → Incremental Spec → Test Runner
- **Product Graph** — Typed nodes and 42 edge types capturing every relationship in your product (used internally for planning and compliance)
- **Semantic diffing** — Classifies changes as structural, behavioral, or policy; propagates impact across the graph
- **900+ diagnostic codes** across 16 categories with source locations and suggested fixes
- **Deterministic builds** — Same input always produces the same SHA-256–hashed graph

### Review System
- **9 built-in reviewer agents** — Architecture, Quality, Code Quality, Specification, UX, Security, Test Quality, Adversarial, and Edge Case reviewers
- **Review/fix loop** — Iterative review cycles with configurable severity thresholds (max 6 loops)
- **Custom reviewers** — Add custom reviewer prompts in `.prodara/reviewers/*.md`
- **Governance** — Auto-generated `agents.md` files enforce coding standards derived from the specification

### Tooling
- **VS Code extension** — Syntax highlighting, diagnostics, completions, hover, go-to-definition, find references, graph visualizer
- **Language Server (LSP)** — Full LSP implementation with incremental text sync and cross-file semantic analysis
- **Machine-readable output** — Every command supports `--format json` for structured consumption
- **Headless API driver** — No UI required; agents drive builds via CLI or programmatic API

## The .prd Language

The AI generates `.prd` specification files from your natural language description. These files use a structured, human-readable syntax:

```
module billing {

  entity Invoice {
    amount:   currency
    status:   draft | sent | paid | overdue
    customer: Customer
    items:    list<LineItem>

    workflow lifecycle {
      draft -> sent:    send
      sent  -> paid:    mark_paid
      sent  -> overdue: mark_overdue
    }
  }

  value LineItem {
    product:  string
    quantity: integer
    price:    currency
  }

  surface InvoiceDashboard {
    kind: dashboard
    shows: Invoice
    actions: [send, mark_paid]
  }

  test "invoices start as draft" {
    given: Invoice
    expect_initial_state: draft
  }

  constitution {
    security {
      authentication: required
    }
    privacy {
      pii_fields: [customer]
      retention: "90 days"
    }
  }
}
```

### Declaration Types

| Category | Types |
|----------|-------|
| **Domain** | `entity`, `value`, `enum`, `rule`, `actor`, `capability` |
| **Behavior** | `workflow`, `action`, `event`, `schedule` |
| **Surface** | `surface`, `rendering`, `tokens`, `theme`, `strings` |
| **Infrastructure** | `integration`, `transport`, `storage`, `execution`, `serialization` |
| **Governance** | `constitution`, `security`, `privacy`, `validation`, `secret`, `environment`, `deployment` |
| **Testing** | `test` |
| **Composition** | `import`, `extension`, `product_ref` |

## Compilation Pipeline

```
.prd files
    │
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Discovery │───▶│  Lexer   │───▶│  Parser  │───▶│  Binder  │───▶│ Checker  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                      │
    ┌─────────────────────────────────────────────────────────────────┘
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Graph   │───▶│  Graph   │───▶│ Registry │───▶│  Differ  │───▶│ Planner  │
│ Builder  │    │Validator │    │Resolution│    │ + Impact │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                      │
    ┌─────────────────────────────────────────────────────────────────┘
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Incremental│───▶│ Workflow │───▶│ Review / │───▶│ Verify   │
│   Spec   │    │  Engine  │    │ Fix Loop │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

| Phase | What It Does |
|-------|-------------|
| **Discovery** | Recursively finds `.prd` files, computes stable SHA-256 file hashes |
| **Lexer** | Tokenizes source into typed tokens with source locations |
| **Parser** | Recursive-descent + Pratt parser builds a fully-typed AST |
| **Binder** | Resolves symbols across modules, handles imports and aliases |
| **Checker** | Type analysis, semantic validation, governance rule enforcement |
| **Graph Builder** | Constructs typed nodes and 42 edge types |
| **Graph Validator** | Validates invariants: endpoints exist, no cycles, module consistency |
| **Registry** | Resolves constitution packages and presets |
| **Differ** | Classifies changes (added, removed, structural, behavioral, policy) and propagates impact |
| **Planner** | Produces tasks: generate, regenerate, remove, or verify per impacted node |
| **Incremental Spec** | Enriches plan with node metadata and produces 6 category slices |
| **Workflow Engine** | Runs deterministic phases with topological task ordering |
| **Review/Fix Loop** | Up to 8 reviewer agents with iterative fix cycles |
| **Verification** | Final gate: graph integrity, task coverage, review acceptance |

## CLI Commands

### Core

```bash
prodara build [path]       # Full pipeline: compile → workflow → review → verify (default command)
prodara init [path]        # Scaffold a new project and generate AI agent prompt
prodara upgrade [path]     # Update project to latest version
prodara validate [path]    # Parse and type-check .prd files
prodara test [path]        # Run spec-level tests
```

### Analysis & Inspection

```bash
prodara graph [path]       # Emit Product Graph
prodara plan [path]        # Generate incremental plan
prodara diff [path]        # Semantic diff since last build
prodara drift [path]       # Detect spec drift
prodara analyze [path]     # Cross-spec consistency analysis
prodara doctor             # Installation & workspace health check
prodara dashboard [path]   # Project overview with aggregate stats
prodara checklist [path]   # Quality validation checklist
prodara explain <node>     # Explain a node in the Product Graph
prodara why <code>         # Explain a diagnostic code
```

### Change Management

```bash
prodara propose "Description"    # Create change proposal
prodara changes                  # List active proposals
prodara apply <proposal>         # Apply proposal after validation
prodara archive <proposal>       # Archive completed proposal
```

> All commands support `--format json` for machine-readable output. Exit code `0` = success, `1` = errors.

## AI Agent Integration

Prodara generates a single prompt file for your AI agent during `prodara init`. This prompt orchestrates the entire build lifecycle:

```bash
# Initialize with agent support
prodara init my-product --ai copilot    # GitHub Copilot
prodara init my-product --ai claude     # Anthropic Claude
prodara init my-product --ai cursor     # Cursor IDE
prodara init my-product --ai gemini     # Google Gemini
# ... and 22 more platforms
```

Once initialized, open the project in your IDE and use the `/prodara` command:

```
/prodara Build a task management app with teams, projects, and Kanban boards
```

The AI agent handles everything:
1. **Clarifies** ambiguities (only pause point)
2. **Generates** `.prd` specification files from your description
3. **Validates** specs with `prodara validate` + multi-perspective review
4. **Builds** via `prodara build` — compiles specs and generates implementation plan
5. **Creates governance** files (`agents.md`) for coding standards
6. **Implements** every file — backend, frontend, database, tests, configs
7. **Reviews** code from 6+ perspectives with auto-fix loop
8. **Delivers** validated, production-ready application

### Design Principles

- **One command** — `/prodara` is the only command users need
- **Deterministic** — Same `.prd` input always produces the same graph output
- **Machine-readable** — JSON output for every CLI command
- **Fully autonomous** — No interactive input; agents drive via CLI
- **Governance-aware** — Respects `agents.md` policy files throughout execution

See [docs/agent-integration.md](docs/agent-integration.md) for the full orchestration contract.

## VS Code Extension

The `prodara-vscode` extension provides a first-class editing experience:

- **Syntax highlighting** — Full TextMate grammar for `.prd` files
- **Real-time diagnostics** — Errors and warnings as you type
- **Smart completions** — Context-aware completions triggered on `.` and `:`
- **Hover information** — Type and documentation on hover
- **Go to definition** — Jump to entity, workflow, and surface declarations
- **Find references** — Locate all usages across files
- **Document outline** — Navigate by module, entity, workflow, surface
- **Graph visualizer** — Interactive Product Graph visualization

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=prodara.prodara-vscode) or search "Prodara" in extensions.

## Programmatic API

Embed the compiler in your own tools:

```typescript
import {
  compile,
  buildGraph,
  createPlan,
  runSpecTests,
  formatDiagnosticsJson,
  serializeGraph,
  sliceGraph,
  sliceAllCategories,
  validateGraph,
  resolveConstitutions,
  buildIncrementalSpec,
  serializeIncrementalSpec,
  runWorkflow,
  runReviewers,
  runReviewFixLoop,
  verify,
  loadConfig,
  resolveConfig,
  DEFAULT_REVIEWERS,
} from '@prodara/compiler';

// Compile and get the Product Graph
const result = compile('./my-project');
if (result.diagnostics.hasErrors) {
  console.error(formatDiagnosticsJson(result.diagnostics));
  process.exit(1);
}

// Run the full build pipeline
const config = loadConfig('./my-project');
const spec = buildIncrementalSpec(result.plan!, result.graph!);
const workflow = runWorkflow(result.graph!, spec, config.config);
const review = runReviewFixLoop(DEFAULT_REVIEWERS, config, result.graph!, spec, 3);
const verification = verify(result.graph!, spec, workflow, review.cycles);
```

## Packages

This repository is an [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo:

| Package | Description |
|---------|-------------|
| [`@prodara/compiler`](packages/compiler/) | Compiler, workflow engine, reviewer agents, CLI, and programmatic API |
| [`@prodara/cli`](packages/cli/) | Global CLI wrapper — resolves project-local compiler and delegates |
| [`@prodara/templates`](packages/templates/) | Prompt templates for workflow phases, reviewers, and 26 AI platforms |
| [`@prodara/lsp`](packages/lsp/) | Language Server Protocol — diagnostics, completions, hover, definitions, references |
| [`@prodara/specification`](packages/specification/) | Language spec, examples, model docs, registry definitions |
| [`prodara-vscode`](packages/vscode/) | VS Code extension with TextMate grammar, LSP client, and graph visualizer |

## Configuration

All settings are optional — sensible defaults are built in.

```jsonc
// prodara.config.json
{
  "phases": {
    "clarify": { "maxQuestions": 10, "minimumQuestionPriority": "medium" }
  },
  "reviewFix": {
    "maxIterations": 3,
    "fixSeverity": ["critical", "error"],
    "parallel": true
  },
  "reviewers": {
    "architecture": { "enabled": true },
    "security": { "enabled": true },
    "codeQuality": { "enabled": true },
    "testQuality": { "enabled": true },
    "uxQuality": { "enabled": true },
    "adversarial": { "enabled": false },
    "edgeCase": { "enabled": false }
  },
  "validation": {
    "lint": "npm run lint",
    "test": "npm test",
    "build": "npm run build"
  },
  "agent": { "provider": "openai", "defaultModel": "gpt-4", "maxImplementRetries": 1 },
  "audit": { "enabled": true }
}
```

## Testing

| Metric | Value |
|--------|-------|
| **Total tests** | 1,800+ across 50+ test files |
| **Coverage** | 100% lines, branches, functions, statements |
| **Packages tested** | compiler, cli, lsp, templates |

### TypeScript Strictness

```jsonc
// tsconfig.json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noPropertyAccessFromIndexSignature": true
}
```

## Development

```bash
npm install             # Install workspace dependencies
npm run build           # Compile TypeScript (all packages)
npm test                # Run full test suite
npm run test:coverage   # Run with coverage (enforces 100%)
npm run typecheck       # Type-check all packages
npm run clean           # Remove dist/ directories
```

### Repository Structure

```
prodara/
├── .github/
│   ├── copilot-instructions.md  # Project-level agent instructions
│   └── prompts/                 # Agent prompt files (.prompt.md)
├── packages/
│   ├── compiler/          # @prodara/compiler — core compiler + CLI + API
│   │   ├── src/
│   │   │   ├── lexer/     # Tokenizer
│   │   │   ├── parser/    # Recursive-descent + Pratt parser
│   │   │   ├── binder/    # Symbol resolution
│   │   │   ├── checker/   # Type checking + semantic validation
│   │   │   ├── graph/     # Product Graph builder + validator
│   │   │   ├── planner/   # Differ + impact propagation + planner
│   │   │   ├── workflow/  # Workflow engine
│   │   │   ├── reviewers/ # 9 built-in reviewer agents
│   │   │   ├── implement/ # AI-driven code generation
│   │   │   ├── cli/       # Commander-based CLI
│   │   │   └── ...        # incremental, verification, audit, config, ...
│   │   └── test/          # 48 test suites
│   ├── cli/               # @prodara/cli — global wrapper
│   ├── templates/         # @prodara/templates — prompts for phases + reviewers
│   ├── lsp/               # @prodara/lsp — Language Server Protocol
│   ├── vscode/            # prodara-vscode — VS Code extension
│   └── specification/     # @prodara/specification — language spec + examples
├── examples/              # Example .prd projects
├── docs/                  # Architecture and usage documentation
└── website/               # www.prodara.net website (Angular)
```

## Documentation

- **Website**: [www.prodara.net](https://www.prodara.net) — Tutorials, language reference, and API docs
- **Architecture**: [docs/architecture.md](docs/architecture.md) — System design and compilation pipeline
- **Agent Integration**: [docs/agent-integration.md](docs/agent-integration.md) — AI agent orchestration contract
- **CLI Usage**: [docs/cli-usage.md](docs/cli-usage.md) — Full command reference
- **Plan Format**: [docs/plan-format.md](docs/plan-format.md) — Incremental plan artifact specification
- **Diagnostics**: [docs/diagnostics.md](docs/diagnostics.md) — Error code reference
- **Product Graph**: [docs/product-graph.md](docs/product-graph.md) — Graph schema and edge types

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code conventions and TypeScript strictness rules
- Test requirements (100% coverage enforced)
- Pull request workflow

## Support

- **Issues**: [github.com/prodara-ai/prodara/issues](https://github.com/prodara-ai/prodara/issues)
- **Security**: See [SECURITY.md](SECURITY.md) for responsible disclosure
- **Enterprise**: Contact [support@prodara.net](mailto:support@prodara.net) for dedicated support

## License

[Apache 2.0](LICENSE)
