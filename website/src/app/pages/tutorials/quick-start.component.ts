import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';
import { CalloutComponent } from '../../components/callout.component';

@Component({
  selector: 'app-quick-start',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
        Beginner &middot; ~5 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Quick Start</h1>
      <p class="mt-4 text-lg text-surface-600">
        Set up your environment, create a project, and build with your AI agent — all in about 5 minutes.
        <strong class="text-surface-900">Your AI agent is the primary builder</strong> — Prodara generates
        the prompts, slash commands, and skills it needs.
      </p>

      <!-- Progress -->
      <nav class="mt-8 rounded-2xl border border-surface-200 bg-surface-50 p-5">
        <h2 class="text-sm font-semibold text-surface-500">Steps</h2>
        <ol class="mt-3 space-y-1.5">
          @for (step of steps; track step.anchor) {
            <li>
              <a [href]="'#' + step.anchor" class="flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm text-surface-700 transition hover:bg-surface-100 hover:text-primary-600">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{{ step.num }}</span>
                {{ step.label }}
              </a>
            </li>
          }
        </ol>
      </nav>

      <!-- Step 1 -->
      <section class="mt-14" id="vscode">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">1</span>
          Install the VS Code Extension
        </h2>
        <p class="mt-4 text-surface-700">
          The <strong class="text-surface-900">Prodara VS Code extension</strong> is the easiest way to work with Prodara.
          It gives you syntax highlighting, real-time diagnostics, and autocomplete for <code>.prd</code> files.
        </p>
        <p class="mt-3 text-surface-700">
          Open VS Code, go to the Extensions panel (<code>Cmd+Shift+X</code>), and search for <strong class="text-surface-900">Prodara</strong>. Click Install.
        </p>
        <app-callout variant="tip">
          The VS Code extension is powered by the Prodara Language Server (LSP).
          Your AI agent (GitHub Copilot, Claude, Cursor, etc.) gets full language support automatically.
        </app-callout>
      </section>

      <!-- Step 2 -->
      <section class="mt-14" id="install">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">2</span>
          Install the CLI
        </h2>
        <p class="mt-4 text-surface-700">Install the Prodara CLI globally via npm:</p>
        <app-code-block code="npm install -g @prodara/cli" language="bash" />
        <p class="mt-2 text-surface-700">Verify the installation:</p>
        <app-code-block code="prodara --version\n# 0.1.0" language="bash" />
        <app-callout variant="info">
          You need Node.js 18+ installed. If you don't have it, visit
          <a href="https://nodejs.org" target="_blank" rel="noopener" class="underline font-medium">nodejs.org</a>.
        </app-callout>
      </section>

      <!-- Step 3 -->
      <section class="mt-14" id="scaffold">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">3</span>
          Create a Project
        </h2>
        <p class="mt-4 text-surface-700">Scaffold a new project from a template:</p>
        <app-code-block code="prodara init my-first-app --template minimal\ncd my-first-app" language="bash" />
        <p class="mt-3 text-surface-700">
          This creates a directory with a single <code>app.prd</code> file - the simplest possible Prodara spec.
        </p>
        <app-callout variant="tip">
          5 templates are available: <code>minimal</code>, <code>saas</code>, <code>marketplace</code>,
          <code>internal-tool</code>, and <code>api</code>. Start with <code>minimal</code> for learning.
        </app-callout>
      </section>

      <!-- Step 4 -->
      <section class="mt-14" id="build">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">4</span>
          Build with Your AI Agent
        </h2>
        <p class="mt-4 text-surface-700">
          Open the project in VS Code. The <code>prodara init</code> command generated agent prompts in
          <code>.github/prompts/</code> and a <code>copilot-instructions.md</code> — your AI agent already knows
          how to build Prodara projects.
        </p>
        <app-code-block code="code my-first-app" language="bash" />
        <p class="mt-3 text-surface-700">
          <strong class="text-surface-900">Use the agent prompt to build:</strong> Open Copilot Chat (or your AI agent)
          and use the <code>prodara-build</code> prompt. The agent will validate, compile, and implement your spec.
        </p>
        <app-code-block [code]="buildPrompt" language="text" filename="In Copilot Chat" />
        <p class="mt-3 text-surface-700">
          Alternatively, use the slash commands generated by <code>prodara init --ai copilot</code>:
        </p>
        <app-code-block code="/prodara:build    # Full pipeline\n/prodara:validate  # Type-check only\n/prodara:plan      # Generate incremental plan" language="text" filename="Slash Commands" />
        <p class="mt-3 text-surface-700">
          The build pipeline validates your spec through 13 compiler phases, produces a
          deterministic Product Graph, generates an incremental plan, and builds code.
        </p>
        <ul class="mt-3 space-y-2 text-surface-700">
          <li class="flex gap-2"><span class="text-primary-600 font-bold">&bull;</span> <strong class="text-surface-900">Product Graph</strong> — all entities, workflows, surfaces, and governance as JSON</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">&bull;</span> <strong class="text-surface-900">Incremental Plan</strong> — exactly what changed and what needs updating</li>
          <li class="flex gap-2"><span class="text-primary-600 font-bold">&bull;</span> <strong class="text-surface-900">Generated Code</strong> — production-ready code from your spec</li>
        </ul>
        <app-callout variant="tip">
          You can also run <code>prodara build .</code> directly in the terminal, but the agent-driven
          workflow is the recommended way to build Prodara projects — your agent handles validation,
          error fixing, and implementation in one flow.
        </app-callout>
      </section>

      <!-- Step 5 -->
      <section class="mt-14" id="agent">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">5</span>
          Iterate with Your Agent
        </h2>
        <p class="mt-4 text-surface-700">
          Now evolve the spec. Ask your AI agent to add features — it already has the Prodara context:
        </p>
        <app-code-block [code]="agentPrompt" language="text" filename="Agent prompt" />
        <p class="mt-3 text-surface-700">
          The agent edits <code>app.prd</code> directly. The VS Code extension validates changes
          in real-time and shows errors inline — creating a <strong class="text-surface-900">review loop</strong>
          between you, your AI agent, and the Prodara compiler.
        </p>
        <p class="mt-3 text-surface-700">
          After your agent makes changes, use the build prompt or slash command again to rebuild:
        </p>
        <app-code-block code="/prodara:build" language="text" />
        <app-callout variant="info">
          The agent prompts and slash commands are the primary way to work with Prodara.
          Most users never need to run CLI commands directly — the agent handles everything.
        </app-callout>
      </section>

      <!-- Step 6 -->
      <section class="mt-14" id="test">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">6</span>
          Run Tests
        </h2>
        <p class="mt-4 text-surface-700">Run the spec-level tests:</p>
        <app-code-block code="prodara test ." language="bash" />
        <p class="mt-3 text-surface-700">
          Tests validate assertions against the compiled Product Graph. In the minimal template,
          the test checks that the <code>task</code> entity exists and has kind <code>"entity"</code>.
        </p>
      </section>

      <!-- Next steps -->
      <section class="mt-16 rounded-2xl border border-primary-200 bg-primary-50 p-8 dark:border-primary-800 dark:bg-primary-900/10">
        <h2 class="text-xl font-bold text-surface-950">What's Next?</h2>
        <p class="mt-2 text-surface-600">
          You've built your first Prodara project! Here's where to go next:
        </p>
        <ul class="mt-4 space-y-3">
          <li class="flex gap-2">
            <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            <div>
              <a routerLink="/tutorials/deep-dive" class="font-semibold text-primary-600 hover:underline">
                Deep Dive Tutorial
              </a>
              <span class="text-surface-600"> - Build a full multi-module Task Board (~30 min)</span>
            </div>
          </li>
          <li class="flex gap-2">
            <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            <div>
              <a routerLink="/docs/agent-integration" class="font-semibold text-primary-600 hover:underline">
                AI Agent Workflows
              </a>
              <span class="text-surface-600"> - Learn how to drive Prodara from any AI agent</span>
            </div>
          </li>
          <li class="flex gap-2">
            <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            <div>
              <a routerLink="/docs/language/entities" class="font-semibold text-primary-600 hover:underline">
                Language Reference
              </a>
              <span class="text-surface-600"> - For power users: learn the full Prodara language</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  `,
})
export class QuickStartComponent {
  readonly steps = [
    { num: 1, anchor: 'vscode', label: 'Install the VS Code Extension' },
    { num: 2, anchor: 'install', label: 'Install the CLI' },
    { num: 3, anchor: 'scaffold', label: 'Create a Project' },
    { num: 4, anchor: 'build', label: 'Build with Your AI Agent' },
    { num: 5, anchor: 'agent', label: 'Iterate with Your Agent' },
    { num: 6, anchor: 'test', label: 'Run Tests' },
  ];

  readonly agentPrompt = `"Add a 'priority' field of type string to the task entity,
with possible values: low, medium, high.
Default to medium. Also add a workflow to
change the priority of a task."`;

  readonly buildPrompt = `@prodara-build Build the current Prodara project.
Validate all .prd files, generate the Product Graph,
and implement the code.`;
}
