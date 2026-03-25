# @prodara/compiler

The core compilation engine, workflow orchestrator, and programmatic API for the Prodara product engineering platform.

## Installation

```bash
npm install @prodara/compiler
```

> **Tip**: `prodara init` installs this package automatically. No separate install step needed.

## Overview

The compiler takes `.prd` specification files through a 13-phase pipeline:

1. **Discovery** → **Lexing** → **Parsing** → **Binding** → **Type Checking** → **Semantic Validation**
2. **Graph Building** → **Graph Validation** → **Constitution Resolution**
3. **Diffing** → **Impact Propagation** → **Planning**
4. **Incremental Spec** → **Workflow Engine** → **Review/Fix Loop** → **Verification**

### How It Fits Together

The primary way to use Prodara is through the `/prodara` command in your AI agent. `prodara init` generates a single prompt file that orchestrates the full lifecycle — the AI agent generates `.prd` specs from your description, the compiler validates and builds them, and the agent implements the resulting plan.

The compiler powers the core CLI commands the agent calls:
- `prodara validate` — parse and type-check `.prd` files
- `prodara build` — full pipeline: compile → workflow → review → verify
- `prodara test` — run spec-level tests

### Implementation Phase

The build pipeline includes an AI-driven implementation phase:

- Extracts implementation instructions from the workflow engine
- Dispatches each task to an AI agent with structured prompts containing task ID, action, node context, related edges, and product graph data
- Supports two modes:
  - **Prompt files** (default) — Generates `.md` prompt files for IDE-based agents (Copilot, Claude, Cursor, etc.)
  - **Headless** (`--headless`) — Sends prompts directly via API to OpenAI, Anthropic, or other providers
- In headless mode, extracts code blocks from AI responses and writes output files to disk
- Supports a validate-after-implement retry loop (configurable via `agent.maxImplementRetries`)

Use `--no-implement` to skip the implementation phase. Use `--dry-run` to preview tasks without executing.

## Programmatic API

```typescript
import { compile, buildGraph, serializeGraph, formatDiagnosticsJson } from '@prodara/compiler';

const result = compile('./my-project');

if (result.diagnostics.hasErrors) {
  console.error(formatDiagnosticsJson(result.diagnostics));
} else {
  console.log(serializeGraph(result.graph!));
}
```

See the [root README](../../README.md) for the full API reference.

## Customization

### Custom Reviewers

Drop `.md` files in `.prodara/reviewers/` to create custom reviewer agents. The filename becomes the reviewer name (e.g., `performance.md` → `performance` reviewer).

```typescript
import { discoverCustomReviewers, loadReviewerPrompt } from '@prodara/compiler';

const customs = await discoverCustomReviewers('/path/to/project');
const prompt = await loadReviewerPrompt(
  { promptPath: '.prodara/reviewers/performance.md' },
  '/path/to/project',
);
```

### Constitution

A project-level constitution provides global instructions injected into all AI prompts:

```json
{
  "constitution": {
    "path": ".prodara/constitution.md"
  }
}
```

### Template Overrides

Override any built-in template with a local `.md` file:

```json
{
  "templateOverrides": {
    "phase:implement": ".prodara/templates/implement.md"
  }
}
```

### Pre-Review Loop

Run reviewers *before* implementation to catch spec-level issues early:

```json
{
  "preReview": {
    "enabled": true,
    "maxIterations": 2,
    "fixSeverity": ["critical", "error"]
  }
}
```

## AI Agent Integration

`prodara init --ai <agent>` generates a single prompt file for 26 supported AI agents. The prompt drives the full 8-phase lifecycle:

1. Clarify → 2. Specify → 3. Spec Review → 4. Build → 5. Govern → 6. Implement → 7. Code Review → 8. Deliver

Each agent gets one file adapted to the platform's format (`.prompt.md` for Copilot, `.md` for Claude, `.mdc` for Cursor, etc.).

## CLI

When installed as a project dependency, provides a local `prodara` binary:

```bash
npx prodara init                       # Scaffold project (auto-installs compiler)
npx prodara init --ai copilot          # Generate prompt file for an AI agent
npx prodara upgrade                    # Update project to latest version
npx prodara build                      # Full pipeline including AI implementation
npx prodara build --headless           # Use API driver instead of prompt files
npx prodara build --dry-run            # Preview tasks without executing
npx prodara validate --format json     # Parse and type-check .prd files
npx prodara test                       # Run spec-level tests
```

## Testing

```bash
npm test              # 1,500+ tests
npm run test:coverage # Enforces 100% coverage
npm run typecheck     # Zero errors
```

## License

Apache 2.0
