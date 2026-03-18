# @prodara/templates

Prompt templates for AI-agent orchestration of the Prodara workflow. Provides render functions for 6 workflow phases and 7 reviewer agents (plus custom reviewers), with platform adapters for 5 AI coding tools.

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

All phase templates support **artifact rules** via `PhaseContext.artifactRules`.

### Reviewer Templates
- `reviewer:architecture` — Module boundaries, dependency direction
- `reviewer:security` — Authorization, credential exposure, injection
- `reviewer:code-quality` — Code standards, patterns, maintainability
- `reviewer:test-quality` — Test coverage, assertions, edge cases
- `reviewer:ux-quality` — Usability, accessibility, consistency
- `reviewer:quality` — General spec quality
- `reviewer:specification` — Spec completeness and correctness

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
- **Copilot** — YAML frontmatter with `mode` and `tools`
- **Claude** — Pass-through markdown
- **Cursor** — MDC frontmatter with `description` and `globs`
- **OpenCode** — Pass-through markdown
- **Codex** — Pass-through markdown

## License

MIT
