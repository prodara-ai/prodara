# @prodara/compiler

The core compilation engine, workflow orchestrator, and programmatic API for the Prodara spec-first language.

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

### Implementation Phase

The primary way to build is through your AI agent — `prodara init` generates agent prompts
(`.github/prompts/prodara-build.prompt.md`), slash commands, and copilot-instructions that
drive the full build pipeline. The agent uses `prodara build` under the hood. The implement phase:

- Extracts implementation instructions from the workflow engine
- Dispatches each task to an AI agent with a structured prompt containing task ID, action, node context, related edges, and product graph data
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

// Discover all custom reviewers in .prodara/reviewers/
const customs = await discoverCustomReviewers('/path/to/project');

// Load a specific reviewer prompt
const prompt = await loadReviewerPrompt(
  { promptPath: '.prodara/reviewers/performance.md' },
  '/path/to/project',
);
```

Alternatively, set `reviewers.{name}.promptPath` in `prodara.config.json` to point to any `.md` file.

### Constitution

A project-level constitution provides global instructions injected into all AI prompts:

```typescript
import { loadConstitution } from '@prodara/compiler';

// Loads from config.constitution.path or .prodara/constitution.md
const text = await loadConstitution(resolvedConfig, '/path/to/project');
```

Configure in `prodara.config.json`:

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

### Per-Artifact Rules

Define rules that are injected into phase templates for specific artifact types:

```json
{
  "artifactRules": {
    "proposal": ["Must include acceptance criteria", "Max 200 words"],
    "design": ["Include sequence diagrams"]
  }
}
```

### Pre-Review Loop

Run reviewers *before* implementation to catch spec-level issues early. Disabled by default:

```json
{
  "preReview": {
    "enabled": true,
    "maxIterations": 2,
    "fixSeverity": ["critical", "error"]
  }
}
```

Skip at runtime with the `noPreReview` pipeline option. The `postReview` key is accepted as a backward-compatible alias for `reviewFix`.
```

### Exploration, Help & Party Mode

Three interactive templates for AI agent collaboration:

- **Explore** (`/prodara:explore <topic>`) — Read-only investigation of a topic within the product graph. Analyzes modules, entities, and relationships without modifying files.
- **Help** (`/prodara:help`) — Contextual guidance based on project state. Detects .prd files, build artifacts, and provides recommendations.
- **Party** (`/prodara:party <topic>`) — Multi-perspective discussion from configured reviewer agents. Each perspective provides analysis, followed by a synthesis.

### Design Documents & Onboarding

- **Design** (`/prodara:design <change>`) — Generates a per-change design document with technical approach, affected modules, predicted file changes, risk assessment, and architecture decisions.
- **Onboard** (`/prodara:onboard`) — Interactive onboarding guide that detects project state (empty, basic, complete) and provides step-by-step guidance tailored to your current setup.

## Slash Commands

`prodara init --ai <agent>` generates slash command files for 26 supported AI agents. Commands are organized into four categories:

| Category | Commands |
|---|---|
| **Workflow** | `build`, `validate`, `constitution`, `specify`, `plan`, `implement`, `clarify`, `review`, `propose`, `explore`, `party` |
| **Spec-edit** | `add-module`, `add-entity`, `add-workflow`, `add-screen`, `add-policy`, `rename`, `move` |
| **Query** | `explain`, `why`, `graph`, `diff`, `drift`, `analyze`, `checklist` |
| **Management** | `help`, `onboard`, `extensions`, `presets` |

29 commands are generated per agent, each adapted to the agent's file format (`.md`, `.prompt.md`, `.mdc`, etc.).

### Extension Marketplace

Search, install, and remove extensions and presets via npm:

```typescript
import { searchMarketplace, npmInstall, npmRemove } from '@prodara/compiler';

// Search for extensions or presets
const extensions = searchMarketplace('auth', 'extension');
const presets    = searchMarketplace('saas', 'preset');

// Install/remove
npmInstall('prodara-extension-auth', process.cwd());
npmRemove('prodara-extension-auth', process.cwd());
```

Convention: extensions are named `prodara-extension-{name}`, presets `prodara-preset-{name}`.

### Custom Workflows

Define named workflow schemas in `.prodara.yaml`:

```yaml
workflows:
  default:
    phases: [specify, clarify, plan, implement, review, verify]
  fast:
    phases: [plan, implement, verify]
    reviewBefore: [security]
  strict:
    phases: [specify, clarify, plan, implement, review, verify]
    reviewBefore: [architecture, security]
    reviewAfter: [quality, testQuality]
```

Each workflow defines its phase sequence and optional `reviewBefore`/`reviewAfter` gates. The `default` workflow is used when none is specified.

## CLI

When installed as a project dependency, provides a local `prodara` binary:

```bash
npx prodara init                       # Scaffold project (auto-installs compiler)
npx prodara init --skip-install        # Scaffold without npm setup
npx prodara build                      # Full pipeline including AI implementation
npx prodara build --headless           # Use API driver instead of prompt files
npx prodara build --dry-run            # Preview implementation tasks without executing
npx prodara build --no-implement       # Skip implementation phase
npx prodara validate --format json
npx prodara graph --output build/graph.json
npx prodara test
```

## Testing

```bash
npm test              # 1,457 tests
npm run test:coverage # Enforces 100% coverage
npm run typecheck     # Zero errors
```

## License

MIT
