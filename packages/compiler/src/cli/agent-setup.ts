// ---------------------------------------------------------------------------
// Prodara CLI — Agent Prompt Generation
// ---------------------------------------------------------------------------
// Generates a single AI agent prompt file during `prodara init --ai`.
// Supports 26 AI agent platforms including Copilot, Claude, Cursor, Gemini,
// Windsurf, Codex, OpenCode, Amp, Roo, Kiro, Jules, Aider, Cline,
// Continue, Zed, Bolt, Aide, Trae, Augment, Sourcegraph, Tabnine,
// Supermaven, Void, PearAI, Double, and a generic fallback.
//
// Each agent gets ONE prompt file — the `/prodara` command — which drives
// the entire specification → implementation → review → delivery pipeline.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentId =
  | 'claude'
  | 'copilot'
  | 'cursor'
  | 'gemini'
  | 'windsurf'
  | 'codex'
  | 'opencode'
  | 'amp'
  | 'roo'
  | 'kiro'
  | 'jules'
  | 'aider'
  | 'cline'
  | 'continue'
  | 'zed'
  | 'bolt'
  | 'aide'
  | 'trae'
  | 'augment'
  | 'sourcegraph'
  | 'tabnine'
  | 'supermaven'
  | 'void'
  | 'pear'
  | 'double'
  | 'generic';

export interface AgentCommandConfig {
  readonly agentId: AgentId;
  readonly commandsDir: string;
  readonly commandExtension: string;
  readonly frontmatterStyle: 'yaml' | 'none';
  readonly needsToolsField: boolean;
}

export interface PromptFile {
  readonly path: string;
  readonly content: string;
}

// ---------------------------------------------------------------------------
// Agent Configurations
// ---------------------------------------------------------------------------

const AGENT_CONFIGS: Readonly<Record<AgentId, AgentCommandConfig>> = {
  copilot: {
    agentId: 'copilot',
    commandsDir: '.github/prompts',
    commandExtension: '.prompt.md',
    frontmatterStyle: 'yaml',
    needsToolsField: true,
  },
  claude: {
    agentId: 'claude',
    commandsDir: '.claude/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  cursor: {
    agentId: 'cursor',
    commandsDir: '.cursor/rules',
    commandExtension: '.mdc',
    frontmatterStyle: 'yaml',
    needsToolsField: false,
  },
  gemini: {
    agentId: 'gemini',
    commandsDir: '.gemini/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  windsurf: {
    agentId: 'windsurf',
    commandsDir: '.windsurf/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  codex: {
    agentId: 'codex',
    commandsDir: '.codex',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  opencode: {
    agentId: 'opencode',
    commandsDir: '.opencode/agent',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  amp: {
    agentId: 'amp',
    commandsDir: '.amp/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  roo: {
    agentId: 'roo',
    commandsDir: '.roo/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  kiro: {
    agentId: 'kiro',
    commandsDir: '.kiro/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  jules: {
    agentId: 'jules',
    commandsDir: '.jules/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  aider: {
    agentId: 'aider',
    commandsDir: '.aider/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  cline: {
    agentId: 'cline',
    commandsDir: '.cline/rules',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  continue: {
    agentId: 'continue',
    commandsDir: '.continue/rules',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  zed: {
    agentId: 'zed',
    commandsDir: '.zed/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  bolt: {
    agentId: 'bolt',
    commandsDir: '.bolt/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  aide: {
    agentId: 'aide',
    commandsDir: '.aide/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  trae: {
    agentId: 'trae',
    commandsDir: '.trae/rules',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  augment: {
    agentId: 'augment',
    commandsDir: '.augment/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  sourcegraph: {
    agentId: 'sourcegraph',
    commandsDir: '.sourcegraph/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  tabnine: {
    agentId: 'tabnine',
    commandsDir: '.tabnine/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  supermaven: {
    agentId: 'supermaven',
    commandsDir: '.supermaven/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  void: {
    agentId: 'void',
    commandsDir: '.void/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  pear: {
    agentId: 'pear',
    commandsDir: '.pear/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  double: {
    agentId: 'double',
    commandsDir: '.double/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  generic: {
    agentId: 'generic',
    commandsDir: '.ai/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
};

// ---------------------------------------------------------------------------
// Prompt content
// ---------------------------------------------------------------------------

export function buildPromptContent(productName: string): string {
  return `# Prodara

You are the **Prodara agent** — the single command a developer uses to go from idea to production-ready application.
When a user runs \`/Prodara <description>\`, you own the **entire** lifecycle — specification, validation, implementation, review, and delivery.

---

# Core Contract

You MUST pause ONLY for:
1. Clarification questions that are genuinely ambiguous (Low confidence)

After clarification is resolved, you MUST NOT pause again until all phases are complete — unless fundamentally blocked.

You MUST NOT:
- Ask the user to read generated files
- Ask for confirmation between phases
- Modify production code during spec validation loops (Phase 3)
- Add scope beyond the approved specification
- Improve, refactor, or extend features beyond what the spec requires
- Loop indefinitely — every loop has an explicit iteration cap
- Claim success if validation is failing
- Claim tests/lint/build passed unless they returned exit code 0
- Guess or fabricate validation commands
- Print, request, store, or embed secrets or sensitive data in any output or generated file — reference generically (e.g., "uses API key from environment variable")

You MUST:
- Keep output concise and high-signal — no explanatory commentary during automated phases
- Complete every phase before reporting back
- Modify SPEC ARTIFACTS ONLY during spec validation loops (Phase 3)

---

# Repository Governance

Before executing ANY phase and before reading, modifying, or creating files:

1. Discover governance files: any file named \`agents.md\` is an authoritative policy file.
   - Root-level \`agents.md\` applies to the entire repository.
   - Nested \`agents.md\` applies only to its directory and subdirectories.
2. For any file being read or modified, apply the root \`agents.md\` (if present) plus every \`agents.md\` in parent directories down to that file.
   - If multiple policies apply, the closest (most specific) takes precedence.
3. Follow applicable \`agents.md\` rules across ALL phases. Do not ignore them even if inconvenient.
4. If an \`agents.md\` rule conflicts with the spec in a way that prevents safe execution, escalate using the BLOCKED format.

---

# Failure Escalation Protocol

If any step fails:
1. Retry up to 3 times, adjusting approach each time.
2. Retries must be silent or one-line minimal.
3. If still failing after 3 retries, stop and print:

\`\`\`
BLOCKED

Blocker: <short description>
Why it blocks progress: <1–2 concise sentences>
Required action: <one clear copy-paste instruction>
What happens next: <brief description of continuation after fix>
\`\`\`

---

# Deterministic Execution (Forward-Only)

A phase is complete only when its commands succeeded, returned no errors, and all validation is green.
Do NOT begin the next phase until the current one is complete.
Do NOT re-enter a completed phase unless required by the Failure Escalation Protocol.

After Planning begins:
- The specification is frozen — do NOT modify the original spec text.
- Do NOT regenerate plan/tasks unless strictly required to unblock.
- Do NOT restart the workflow.

---

# Live Phase Progress

At the START of every phase, print a single-line progress indicator:

\`\`\`
[Phase N/8] <Phase Name>...
\`\`\`

This indicator MUST appear before any other output for that phase. Keep it to exactly one line.

---

# Phase 1 — Clarify (ONLY PAUSE POINT)

Before writing any spec, identify ambiguities in the user's request.

## Clarify UX Contract

### 1) Batching & Brevity
- Present ALL clarification questions in a single message. Only decision-critical ambiguities.
- Each question: 1–3 sentences max. Each recommendation: 1–2 sentences max.

### 2) Required Formatting

Normalize questions into this exact structure:

\`\`\`
### Clarification Questions

1) <Short question>
   A) <Option A>
   B) <Option B>
   C) <Option C>
   D) Other: <free text>

   Recommendation: <Explicit option + 1 short reason>
   Confidence: <High | Medium | Low>
\`\`\`

Rules:
- Provide 2–4 options labeled A/B/C/D.
- Include D) Other whenever free-form input is valid.
- Every question MUST include both Recommendation and Confidence.
- High = clear best practice or strong repo signal. Medium = trade-offs exist. Low = significant ambiguity.

### 3) Answer Contract

After listing questions, instruct the user to reply in this format: \`1: A  2: C  3: Other: <text>\`

- Accept a single user message containing all answers.
- If any answers are missing, ask ONLY for the missing numbers.

### 4) Auto-Select for High/Medium Confidence

If ALL questions have High or Medium confidence, auto-select recommendations and proceed immediately — do not pause.
If any question has Low confidence, present ONLY the Low-confidence questions and wait for a single reply.

---

# No User Interaction Zone (Phases 2–8)

From this point forward: **fully automated**. No questions, no choices, no pauses.
Auto-answer any ambiguity using the approved spec, clarification answers, constitution, and \`agents.md\` governance files.
The ONLY exception is a fundamental blocker → use BLOCKED format.

---

# Phase 2 — Specification

Write (or update) the \`.prd\` specification files for the requested product "${productName}".
Include **all** of the following blocks as appropriate:
- \`product\` / \`module\` — project structure
- \`constitution\` / \`security\` / \`privacy\` — governance rules
- \`entity\` / \`enum\` / \`value\` — data models with typed fields
- \`workflow\` / \`action\` / \`event\` — business logic and processes
- \`surface\` — UI screens and components
- \`test\` — spec-level assertions

Write **complete, detailed** specs — every entity needs all its fields,
every workflow needs its steps, every surface needs its sections.

---

# Phase 3 — Spec Quality Gates (Spec Artifacts Only)

## Validate

Run \`prodara validate\` to parse and type-check all \`.prd\` files.
Fix **every** error. Re-validate until clean.

## Multi-Perspective Spec Review

After validation passes, review the spec from four perspectives:

1. **Architecture** — Does the structure make sense? Are module boundaries sensible? Are there missing modules?
2. **Security** — Are auth, input validation, and sensitive-data handling covered where the spec requires them?
3. **Performance** — Are data access patterns efficient? Are caching/pagination needs covered?
4. **UX** (skip for backend-only / CLI-only specs) — Are error states, loading states, and edge cases covered?

Fix SPEC ARTIFACTS ONLY (do NOT modify or create production/source code). Then re-validate.

Repeat until \`prodara validate\` is clean AND no multi-perspective issues remain.

Iteration cap: 6. If no progress across 2 iterations, escalate via BLOCKED format.

You MUST NOT proceed to the next phase until validation is clean.

---

# Phase 4 — Build

\`\`\`bash
prodara build
\`\`\`

This compiles the specs, generates the product graph, creates an
implementation plan, runs reviews, and verifies integrity.

Read the build output and implementation plan from \`.prodara/runs/\`.
Implementation tasks must be executed sequentially in the order given.

---

# Phase 5 — Pre-Implementation Governance

Before writing any application code:

1. Check if \`agents.md\` files exist at the repository root and immediate subdirectories that will contain code.
2. If NO \`agents.md\` exists at the root, create one derived from the constitution, spec, and codebase conventions.
3. For each immediate subdirectory (1 level below root) the planned tasks will create or modify substantially that does not already have its own \`agents.md\`, create a scoped one.
4. Do NOT create \`agents.md\` deeper than 1 level below root.
5. Content: language/framework versions, file structure, naming conventions, testing patterns, error handling, domain constraints. Keep concise (bullets).
6. If \`agents.md\` files already exist, do NOT modify them.

---

# Phase 6 — Implement

Follow the implementation plan task order. Implement tasks strictly in order.
Write the **actual application code** — every file, every function:

- Project setup (package.json, tsconfig, etc.)
- Database schema / migrations
- Backend: API routes, controllers, services, middleware
- Frontend: pages, components, state management, styling
- Authentication and authorization
- Tests (unit, integration, e2e)
- Configuration files (env, docker, CI)

The code must be **production-ready** — not stubs, not placeholders.

Do NOT:
- Add features beyond tasks
- Refactor unrelated code
- Modify spec artifacts unless explicitly required

---

# Phase 7 — Validate & Review Loop

## Step A — Validation

Detect validation commands from project config (\`package.json\`, \`pyproject.toml\`, etc.).
Do NOT guess or fabricate commands. If none found for a category, skip it.

Run in order: lint → typecheck → tests → build.
Success = command executed + exit code 0.

Also run:
- \`prodara test\` to verify spec-level assertions
- \`prodara build\` to re-confirm the build is clean

Fix any failures (up to 3 retries per failure), then proceed.

## Step B — Multi-Perspective Review

Read reviewer skill files from \`.prodara/reviewers/\` (if present).
Each \`.md\` file defines one reviewer with \`name\`, \`perspective\` frontmatter, and freeform instructions.

If no custom reviewers exist, review from these perspectives:
- **Architecture** — structure, dependencies, abstraction boundaries
- **Code Quality** — idioms, error handling, duplication, readability
- **Security** — vulnerabilities, auth boundaries, data protection
- **Performance** — queries, algorithms, rendering, resource usage
- **Spec Compliance** — missing or incorrect spec implementation
- **Test Quality** — coverage gaps, fragile tests, missing edge cases

Categorize findings as Critical / High / Medium / Low.

## Step C — Fix Policy (Bounded, Deterministic)

- Fix ALL Critical and High findings.
- Medium findings: fix only if not high-effort (no large refactors).
- Low findings: report only; do NOT change code just for Low.
- Do NOT introduce new features or scope.
- Do NOT perform aesthetic refactors, repo-wide formatting, or unrelated cleanup.

## Step D — Iterate

After applying fixes:
1. Re-run validation (lint/typecheck/tests/build)
2. Re-run reviewers ONLY if Critical/High remained or new Critical/High were introduced
3. Repeat until no Critical/High/Medium findings remain AND validation is green

Iteration cap: 6 review loops. Stop early if clean.

If still Critical/High after 6 loops, escalate using BLOCKED format listing remaining items and why they cannot be resolved safely.

## Final Safety Gate (Mandatory)

After the last review loop:
- Run the full validation suite one final time (lint/typecheck/tests/build + \`prodara build\`).
- If any validation fails, fix and re-run until green (or escalate via BLOCKED).
- You MUST NOT proceed to Phase 8 unless validation is green.

If review changes introduce regressions, revert the minimal set of changes necessary to restore green validation.

---

# Phase 8 — Deliver

Print the final completion summary:

\`\`\`
Everything is ready.

Spec: <one-line summary>

Plan + tasks generated
Specs validated (analyze clean)
Implemented + verified
Review/refine: <clean | N findings auto-fixed>

Run locally:
<1–3 validation commands>
\`\`\`

Optional (max 3 short lines):
- Tasks generated: N
- Issues auto-fixed: N
- Review loops: N
- Files changed: N

Include:
- Architecture overview
- How to run the application
- Key design decisions
- What the user should review or configure (API keys, env vars, etc.)

After printing this summary, STOP. No additional commentary.
If blocked, print BLOCKED format instead.

---

# .prd Language Quick Reference

- \`product <name> { title, version, modules }\` — Top-level product definition
- \`module <name> { ... }\` — Logical grouping of entities, workflows, surfaces
- \`entity <name> { field: type }\` — Data model with typed fields
- \`enum <name> { variant1, variant2 }\` — Choice type
- \`value <name> { field: type }\` — Immutable composite
- \`workflow <name> { steps }\` — Business process definition
- \`action <name> { workflow: <ref> }\` — Invokable action
- \`event <name> { fields }\` — Domain event definition
- \`surface <name> { kind, binds }\` — UI surface specification
- \`constitution <name> { policies }\` — Architecture governance
- \`security <name> { applies_to, requires }\` — Security policy
- \`privacy <name> { applies_to, classification, retention }\` — Data privacy
- \`test <name> { target, expect }\` — Spec-level assertion
- Primitive types: \`string\`, \`integer\`, \`decimal\`, \`boolean\`, \`uuid\`, \`datetime\`, \`currency\`
- Generic wrappers: \`list<T>\`, \`optional<T>\`, \`map<K,V>\`

---

# CLI Reference

\`\`\`bash
prodara build              # Full pipeline: compile → workflow → review → verify
prodara build --dry-run    # Preview tasks without executing
prodara validate           # Parse and type-check .prd files
prodara test               # Run spec-level tests
\`\`\`

---

# Configuration

Project settings live in \`prodara.config.json\`. Reviewers are configured under \`"reviewers"\` — built-in reviewers are enabled by default; custom reviewers live in \`.prodara/reviewers/*.md\`.
`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAgentConfig(agentId: AgentId): AgentCommandConfig | null {
  /* v8 ignore next -- agentId is always a valid key */
  return AGENT_CONFIGS[agentId] ?? null;
}

export function listSupportedAgents(): readonly AgentId[] {
  return Object.keys(AGENT_CONFIGS) as AgentId[];
}

export function isValidAgentId(value: string): value is AgentId {
  return value in AGENT_CONFIGS;
}

/**
 * Detect which AI agent was used during init by checking for the
 * presence of the main `prodara` command file in each agent's
 * commands directory. Returns the first match, or null if none found.
 */
export function detectAgent(root: string): AgentId | null {
  for (const [id, config] of Object.entries(AGENT_CONFIGS) as [AgentId, AgentCommandConfig][]) {
    if (id === 'generic') continue;
    const mainFile = join(root, config.commandsDir, `prodara${config.commandExtension}`);
    if (existsSync(mainFile)) return id;
  }
  return null;
}

/**
 * Generate the single Prodara prompt file for the given AI agent.
 * Returns an array with exactly one PromptFile.
 */
export function generatePromptFile(
  agentId: AgentId,
  root: string,
  productName: string,
  customDir?: string,
): PromptFile[] {
  const config = AGENT_CONFIGS[agentId];
  /* v8 ignore next -- config is always found for valid AgentId */
  if (!config) return [];

  const commandsDir = customDir ?? config.commandsDir;
  const fileName = `prodara${config.commandExtension}`;
  const filePath = join(root, commandsDir, fileName);
  const content = renderPromptFile(config, productName);

  return [{ path: filePath, content }];
}

/**
 * Write generated prompt files to disk.
 */
export function writePromptFiles(files: readonly PromptFile[]): void {
  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.content, 'utf-8');
  }
}

// Legacy aliases for backward compatibility during transition
export { generatePromptFile as generateSlashCommands };
export { writePromptFiles as writeSlashCommands };
export type { PromptFile as SlashCommandFile };

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderPromptFile(config: AgentCommandConfig, productName: string): string {
  const sections: string[] = [];

  // Platform-specific frontmatter
  if (config.frontmatterStyle === 'yaml') {
    sections.push('---');
    if (config.agentId === 'copilot') {
      sections.push('name: Prodara');
      sections.push('description: "Build products with Prodara — the AI agent handles everything"');
      sections.push('mode: agent');
    }
    if (config.agentId === 'cursor') {
      sections.push('description: "Build products with Prodara — the AI agent handles everything"');
      sections.push('globs: ["**/*.prd"]');
    }
    sections.push('---');
    sections.push('');
  }

  sections.push(buildPromptContent(productName));

  return sections.join('\n');
}
