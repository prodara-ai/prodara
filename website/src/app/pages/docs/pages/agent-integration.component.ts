import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-agent-integration',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">AI Agent Integration</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara is designed to be driven by AI coding agents. Most users never write Prodara by hand -
        they describe what they want in natural language, and their AI agent writes and iterates on
        the <code>.prd</code> specification using the compiler as a feedback loop.
      </p>

      <!-- Compatible providers -->
      <div class="mt-8 rounded-xl border border-surface-200 bg-surface-50 p-6 not-prose">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-surface-500">Compatible AI Providers</h2>
        <div class="mt-4 flex flex-wrap gap-3">
          @for (provider of providers; track provider) {
            <span class="rounded-full border border-surface-200 bg-surface-0 px-3 py-1 text-sm font-medium text-surface-700">{{ provider }}</span>
          }
        </div>
        <p class="mt-3 text-sm text-surface-500">
          Any AI agent that can read files, write files, and run terminal commands works with Prodara.
        </p>
      </div>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">How It Works</h2>
      <p class="mt-2 text-surface-600">
        The agent-driven workflow is a three-party loop between <strong>You</strong> (the human),
        <strong>Your AI Agent</strong>, and the <strong>Prodara Compiler</strong>:
      </p>
      <div class="mt-6 space-y-4 not-prose">
        @for (step of loopSteps; track step.num) {
          <div class="flex gap-4 rounded-lg border border-surface-200 bg-surface-50 p-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30">{{ step.num }}</span>
            <div>
              <p class="font-medium text-surface-950">{{ step.title }}</p>
              <p class="mt-1 text-sm text-surface-500">{{ step.desc }}</p>
            </div>
          </div>
        }
      </div>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">VS Code Extension</h2>
      <p class="mt-2 text-surface-600">
        The Prodara VS Code extension enhances the agent workflow with real-time feedback:
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><strong class="text-surface-900">Syntax Highlighting</strong> - Full TextMate grammar for <code>.prd</code> files so you can review agent output at a glance</li>
        <li><strong class="text-surface-900">Real-Time Diagnostics</strong> - Errors and warnings appear inline as the agent writes, without needing to run the CLI</li>
        <li><strong class="text-surface-900">LSP Integration</strong> - Go-to-definition, hover info, and symbol navigation across modules</li>
        <li><strong class="text-surface-900">Agent-Friendly</strong> - AI agents running in VS Code (Copilot, Cursor, etc.) can see diagnostics directly in the editor context</li>
      </ul>

      <app-callout variant="info">
        Install the VS Code extension from the Extensions Marketplace - search for <strong>Prodara</strong>.
        See the <a routerLink="/tutorials/quick-start" class="underline">Quick Start</a> for setup instructions.
      </app-callout>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">CLI Contract</h2>
      <p class="mt-2 text-surface-600">
        The CLI is the agent's interface to the compiler. It's designed to be non-interactive,
        deterministic, and machine-readable:
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><strong class="text-surface-900">Non-interactive</strong> - No prompts, no user input required</li>
        <li><strong class="text-surface-900">Deterministic</strong> - Same input always produces the same output</li>
        <li><strong class="text-surface-900">JSON output</strong> - <code>--format json</code> on every command</li>
        <li><strong class="text-surface-900">Clean exit codes</strong> - 0 for success, 1 for errors</li>
        <li><strong class="text-surface-900">stdout/stderr separation</strong> - JSON on stdout, logs on stderr</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Agent Workflow Commands</h2>
      <p class="mt-2 text-surface-600">
        A typical agent workflow follows this sequence:
      </p>
      <app-code-block [code]="workflow" language="bash" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Iterative Fix Loop</h2>
      <p class="mt-2 text-surface-600">
        When validation fails, diagnostics include <code>fix.suggestions</code> with exact file locations
        and machine-applicable text edits. The agent reads the diagnostic, applies the fix, and
        re-validates until the spec compiles cleanly.
      </p>
      <app-code-block [code]="fixLoop" language="json" filename="diagnostic with fix suggestion" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Four JSON Outputs</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 not-prose">
        @for (output of outputs; track output.title) {
          <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
            <p class="font-semibold text-surface-950">{{ output.title }}</p>
            <p class="mt-1 text-sm text-surface-500">{{ output.desc }}</p>
          </div>
        }
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Example Agent Prompt</h2>
      <p class="mt-2 text-surface-600">
        Here's an example prompt you can give your AI agent to create a Prodara spec:
      </p>
      <app-code-block [code]="agentPrompt" language="text" filename="agent prompt" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        Learn about the
        <a routerLink="/docs/slash-commands" class="text-primary-600 hover:underline">single AI prompt file</a>
        generated for each agent, try
        <a routerLink="/docs/interactive-modes" class="text-primary-600 hover:underline">interactive modes</a>
        like Explore, Help, and Party, or configure
        <a routerLink="/docs/customization" class="text-primary-600 hover:underline">custom reviewers</a>
        for the review pipeline.
      </p>
    </article>
  `,
})
export class AgentIntegrationComponent {
  readonly providers = [
    'GitHub Copilot',
    'Claude Code',
    'OpenCode',
    'Cursor',
    'Windsurf',
    'Codex',
    'Gemini',
    'Kiro',
    'Jules',
    'Amp',
    'Roo',
    'Aider',
    'Cline',
    'Continue',
    'Zed',
    'Bolt',
    'Aide',
    'Trae',
    'Augment',
    'Sourcegraph',
    'Tabnine',
    'Supermaven',
    'Void',
    'Pear',
    'Double',
    'Generic',
  ];

  readonly loopSteps = [
    { num: '1', title: 'You describe what you want', desc: 'Tell your AI agent in natural language what your product should do - entities, workflows, rules, screens.' },
    { num: '2', title: 'Agent writes .prd files', desc: 'The agent creates or modifies Prodara specification files based on your description.' },
    { num: '3', title: 'Agent compiles with the CLI', desc: 'The agent runs `prodara build --format json` and reads the structured output.' },
    { num: '4', title: 'Agent fixes errors', desc: 'If the compiler reports diagnostics, the agent reads the suggested fixes and applies them automatically.' },
    { num: '5', title: 'You review the result', desc: 'The VS Code extension shows you the spec with syntax highlighting and diagnostics. Approve or request changes.' },
    { num: '6', title: 'Repeat', desc: 'Continue the loop - describe a new feature, the agent writes it, the compiler validates, you review.' },
  ];

  readonly outputs = [
    { title: 'Diagnostics', desc: 'Errors, warnings, and machine-applicable fix suggestions with exact source locations.' },
    { title: 'Product Graph', desc: 'The compiled semantic model - all nodes, edges, and metadata as JSON.' },
    { title: 'Plan Artifact', desc: 'Incremental change analysis with impact propagation and actionable tasks.' },
    { title: 'Test Results', desc: 'Spec test pass/fail status for transitions, authorization, and validation rules.' },
  ];

  readonly workflow = `# 1. Validate the spec
prodara validate --format json ./project

# 2. If errors, apply fixes and re-validate
# (the agent reads diagnostics and fixes automatically)

# 3. Emit the Product Graph
prodara graph --format json ./project

# 4. Generate incremental plan
prodara plan --format json ./project

# 5. Run spec tests
prodara test --format json ./project`;

  readonly fixLoop = `{
  "code": "PRD0301",
  "severity": "error",
  "message": "Type mismatch: expected 'money', got 'string'",
  "location": {
    "file": "billing.prd",
    "line": 12,
    "column": 10
  },
  "fix": {
    "description": "Change field type to money",
    "edits": [
      { "line": 12, "oldText": "total: string", "newText": "total: money" }
    ]
  }
}`;

  readonly agentPrompt = `I have a Prodara project in ./my-project. Create a billing module with:
- An invoice entity with customer reference, line items, total, status
- Workflows: create_invoice, issue_invoice, pay_invoice
- A dashboard surface for viewing all invoices
- Authorization: only accountants can create invoices
- Tests for the status transitions

Run \`prodara build --format json ./my-project\` after writing the spec
to validate it. Fix any errors the compiler reports.`;
}
