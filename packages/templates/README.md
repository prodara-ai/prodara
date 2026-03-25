# @prodara/templates

Prompt templates for AI-agent orchestration of the Prodara workflow. Provides render functions for 11 workflow phases and 7 reviewer agents (plus custom reviewers), with platform adapters for 26 AI coding tools.

## Installation

```bash
npm install @prodara/templates
```

## Usage

```typescript
import { render, listTemplates, wrapForPlatform } from '@prodara/templates';

// Render a phase template
const markdown = render('phase:specify', {
  moduleName: 'billing',
  specText: '...',
});

// Render with platform wrapping
const output = render('phase:implement', context, { platform: 'copilot' });

// Render with template override
const custom = render('phase:implement', context, {
  templateOverride: '# My custom template\n...',
});

// List all available templates
const ids = listTemplates();
// ['phase:specify', 'phase:clarify', ..., 'reviewer:architecture', ...]
```

## Templates

### Phase Templates
- `phase:specify` — Specification analysis
- `phase:clarify` — Clarification questions
- `phase:plan` — Execution plan
- `phase:implement` — Implementation task
- `phase:review` — Code review
- `phase:fix` — Fix request
- `phase:explore` — Codebase exploration
- `phase:help` — Help and guidance
- `phase:party` — Celebration / completion
- `phase:design` — Design system rendering
- `phase:onboard` — Onboarding walkthrough

All phase templates support **artifact rules** via `PhaseContext.artifactRules`.

### Reviewer Templates
- `reviewer:architecture` — Module boundaries, dependency direction
- `reviewer:security` — Authorization, credential exposure, injection
- `reviewer:code-quality` — Code standards, patterns, maintainability
- `reviewer:test-quality` — Test coverage, assertions, edge cases
- `reviewer:ux-quality` — Usability, accessibility, consistency
- `reviewer:adversarial` — Adversarial input, abuse scenarios
- `reviewer:edge-case` — Boundary conditions, error paths

All built-in reviewers support **custom instructions** via `ReviewContext.customPrompt`.

### Custom Reviewers

The `renderCustomReview()` function handles any user-defined reviewer:

```typescript
import { renderCustomReview } from '@prodara/templates';

const output = renderCustomReview({
  ...reviewContext,
  reviewerName: 'performance',
  customPrompt: 'Focus on database query optimization...',
});
```

Dynamic dispatch: `render('reviewer:my-custom', ctx)` automatically routes to `renderCustomReview()` for non-built-in IDs.

### Template Overrides

Pass `templateOverride` in `RenderOptions` to replace any built-in template:

```typescript
const output = render('phase:specify', ctx, {
  templateOverride: customMarkdown,
  platform: 'copilot',
});
```

### Platform Adapters

All 26 supported AI coding platforms:

- **Copilot** — YAML frontmatter with `mode` and `tools`
- **Claude** — Pass-through markdown
- **Cursor** — MDC frontmatter with `description` and `globs`
- **OpenCode** — Pass-through markdown
- **Codex** — Pass-through markdown
- **Gemini, Windsurf, Kiro, Jules, Amp, Roo, Aider, Cline, Continue, Zed, Bolt, Aide, Trae, Augment, Sourcegraph, Tabnine, Supermaven, Void, Pear, Double** — Platform-specific adapters
- **Generic** — Fallback for any unlisted tool

## License

Apache-2.0
