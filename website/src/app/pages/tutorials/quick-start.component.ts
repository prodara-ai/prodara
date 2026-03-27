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
        Beginner &middot; ~3 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Quick Start</h1>
      <p class="mt-4 text-lg text-surface-600">
        Three steps. That's it. Initialize a project, open your IDE, and tell your AI agent what to build.
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
      <section class="mt-14" id="install">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">1</span>
          Install &amp; Initialize
        </h2>
        <p class="mt-4 text-surface-700">Install the CLI and create a project:</p>
        <app-code-block code="npm install -g @prodara/cli\nprodara init my-app\ncd my-app" language="bash" />
        <p class="mt-3 text-surface-700">
          That's all the CLI does — it scaffolds a <code>.prd</code> spec file and configures your AI agent automatically.
          The Prodara VS Code extension (optional) gives you syntax highlighting and real-time diagnostics.
        </p>
        <app-callout variant="tip">
          5 templates are available: <code>minimal</code>, <code>saas</code>, <code>marketplace</code>,
          <code>internal-tool</code>, and <code>api</code>. Use <code>--template saas</code> to start with a richer spec.
        </app-callout>
      </section>

      <!-- Step 2 -->
      <section class="mt-14" id="build">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">2</span>
          Open Your IDE &amp; Build
        </h2>
        <p class="mt-4 text-surface-700">Open the project and tell your agent what to build:</p>
        <app-code-block code="code my-app" language="bash" />
        <p class="mt-3 text-surface-700">
          In Copilot Chat (or any AI agent), just say:
        </p>
        <app-code-block [code]="buildPrompt" language="text" filename="Copilot Chat" />
        <p class="mt-3 text-surface-700">
          Your agent handles everything — it writes the <code>.prd</code> spec, runs the compiler, and implements the code.
          No need to learn any commands or syntax. The agent already knows how Prodara works.
        </p>
        <app-callout variant="info">
          <code>prodara init</code> generates a <code>/Prodara</code> prompt and
          copilot-instructions automatically. Your agent is ready to build from the moment you open the project.
        </app-callout>
      </section>

      <!-- Step 3 -->
      <section class="mt-14" id="iterate">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">3</span>
          Iterate
        </h2>
        <p class="mt-4 text-surface-700">
          Want to change something? Just ask:
        </p>
        <app-code-block [code]="iteratePrompt" language="text" filename="Copilot Chat" />
        <p class="mt-3 text-surface-700">
          The agent updates the spec, rebuilds, and implements the changes. The VS Code extension shows
          real-time validation so you and your agent catch errors instantly.
        </p>
      </section>

      <!-- CLI reference (collapsed) -->
      <section class="mt-14" id="cli">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-300 text-sm font-bold text-white shadow-md">?</span>
          Optional: CLI Reference
        </h2>
        <p class="mt-4 text-surface-700">
          Most users never need these — your agent runs them for you. But if you want to run commands manually:
        </p>
        <app-code-block code="prodara build          # Full pipeline\nprodara validate       # Type-check .prd files\nprodara test .         # Run spec tests\nprodara diff           # Show what changed" language="bash" />
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
              <span class="text-surface-600"> - Configure Prodara for Claude, Cursor, Gemini, and 23 more agents</span>
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
    { num: 1, anchor: 'install', label: 'Install & Initialize' },
    { num: 2, anchor: 'build', label: 'Open Your IDE & Build' },
    { num: 3, anchor: 'iterate', label: 'Iterate' },
  ];

  readonly buildPrompt = `/Prodara Build me a ToDo application with tasks,
due dates, and priority levels.`;

  readonly iteratePrompt = `/Prodara Add a "completed" filter and a
workflow to archive old tasks.`;
}
