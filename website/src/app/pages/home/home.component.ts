import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CodeBlockComponent],
  template: `
    <!-- ═══════════════════════ HERO ═══════════════════════ -->
    <section class="relative overflow-hidden bg-gradient-to-b from-primary-50 to-surface-0 dark:from-surface-50 dark:to-surface-0">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]"></div>
      <div class="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div class="mx-auto max-w-3xl text-center">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
            <span class="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse"></span>
            v0.1 - First Public Release
          </div>
          <h1 class="text-4xl font-extrabold tracking-tight text-surface-950 sm:text-5xl lg:text-6xl">
            The AI-Native Product<br />
            <span class="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Specification Ecosystem</span>
          </h1>
          <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-surface-600 sm:text-xl">
            Describe your product in plain English-like specs. Prodara's compiler validates everything,
            and your AI coding agent turns it into production-ready code - <strong class="text-surface-900">with governance,
            testing, and incremental builds built in</strong>.
          </p>
          <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              routerLink="/tutorials/quick-start"
              class="inline-flex items-center justify-center rounded-xl bg-primary-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Get Started in 5 Minutes
              <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </a>
            <a
              routerLink="/docs"
              class="inline-flex items-center justify-center rounded-xl border border-surface-200 bg-surface-0/80 px-7 py-3.5 text-sm font-semibold text-surface-900 backdrop-blur-sm transition hover:bg-surface-100"
            >
              Read the Docs
            </a>
          </div>

          <!-- Install command -->
          <div class="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-xl border border-surface-200 bg-surface-950 px-4 py-3 dark:border-surface-200 dark:bg-surface-100">
            <code class="font-mono text-sm text-green-400 dark:text-green-600">$</code>
            <code class="font-mono text-sm text-surface-300 dark:text-surface-600">npm install -g &#64;prodara/cli</code>
            <button
              (click)="copyInstall()"
              class="ml-auto rounded p-1 text-surface-400 hover:text-white dark:hover:text-surface-900 transition"
              aria-label="Copy install command"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ AI PROVIDERS ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-0 py-12">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <p class="text-center text-sm font-medium text-surface-500">Works with all major AI providers</p>
        <p class="mt-1 text-center text-2xl font-bold text-surface-950">26+ AI agents supported</p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          @for (provider of aiProviderNames; track provider) {
            <span class="rounded-full border border-surface-200 bg-surface-0 px-3 py-1 text-sm font-medium text-surface-700">{{ provider }}</span>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ THE ECOSYSTEM ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-50 py-20 sm:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
            One Ecosystem. Everything You Need.
          </h2>
          <p class="mt-4 text-lg text-surface-600">
            Prodara isn't just a language - it's a complete toolchain for turning product ideas
            into production-ready code.
          </p>
        </div>

        <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          @for (pillar of ecosystemPillars; track pillar.title) {
            <div class="group relative rounded-2xl border border-surface-200 bg-surface-0 p-6 transition hover:border-primary-200 hover:shadow-lg dark:bg-surface-50">
              <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-lg text-white shadow-md shadow-primary-500/20">
                <span [innerHTML]="pillar.icon"></span>
              </div>
              <h3 class="text-lg font-semibold text-surface-950">{{ pillar.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-surface-600">{{ pillar.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ HOW IT WORKS ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-0 py-20 sm:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-center text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
          How It Works
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-center text-lg text-surface-600">
          From idea to production-ready code in three steps.
        </p>
        <div class="mt-16 grid gap-6 lg:grid-cols-3">
          @for (step of howItWorks; track step.num) {
            <div class="relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 p-8 transition hover:shadow-lg">
              <div class="absolute -right-4 -top-4 text-8xl font-extrabold text-surface-100 dark:text-surface-200 select-none">{{ step.num }}</div>
              <div class="relative">
                <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">
                  {{ step.num }}
                </div>
                <h3 class="text-xl font-semibold text-surface-950">{{ step.title }}</h3>
                <p class="mt-3 text-sm leading-relaxed text-surface-600">{{ step.desc }}</p>
                <code class="mt-4 block rounded-lg bg-surface-100 px-3 py-2 font-mono text-xs text-surface-700">{{ step.cmd }}</code>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ VS CODE EXTENSION ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-50 py-20 sm:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-600 dark:text-accent-400">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.583 2.603a1.263 1.263 0 0 1 1.553.167l3.555 3.555a1.263 1.263 0 0 1 .167 1.553l-8.342 13.29a1.263 1.263 0 0 1-.942.579l-5.263.32a1.263 1.263 0 0 1-1.304-1.196l-.212-5.267a1.263 1.263 0 0 1 .37-1.004L17.583 2.603z"/></svg>
              VS Code Extension
            </div>
            <h2 class="text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
              First-Class IDE Experience
            </h2>
            <p class="mt-4 text-lg text-surface-600">
              The Prodara VS Code extension is the easiest way to work with Prodara.
              Get real-time feedback as you write - or let your AI agent write for you.
            </p>
            <ul class="mt-8 space-y-4">
              @for (feature of vscodeFeatures; track feature.title) {
                <li class="flex gap-3">
                  <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="m5 12 5 5L20 7"/></svg>
                  </div>
                  <div>
                    <strong class="text-sm font-semibold text-surface-950">{{ feature.title }}</strong>
                    <p class="text-sm text-surface-600">{{ feature.desc }}</p>
                  </div>
                </li>
              }
            </ul>
          </div>

          <!-- Right: code preview showing VS Code-like experience -->
          <div class="hidden lg:block">
            <app-code-block
              [code]="heroCode"
              language="prd"
              filename="app.prd"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ WHY PRODARA ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-0 py-20 sm:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-center text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
          Why Prodara?
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-center text-lg text-surface-600">
          Whether you're new to specification languages or migrating from another tool,
          Prodara gives you superpowers.
        </p>

        <div class="mt-16 grid gap-8 lg:grid-cols-2">
          <!-- Track 1: New users -->
          <div class="rounded-2xl border border-surface-200 bg-surface-50 p-8">
            <h3 class="text-xl font-semibold text-surface-950">New to Spec Languages?</h3>
            <p class="mt-2 text-sm text-surface-600">Here's why your first spec should be a Prodara spec:</p>
            <ul class="mt-6 space-y-4">
              @for (item of newUserReasons; track item.title) {
                <li class="flex gap-3">
                  <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg>
                  <div>
                    <strong class="text-sm font-semibold text-surface-950">{{ item.title }}</strong>
                    <p class="text-sm text-surface-600">{{ item.desc }}</p>
                  </div>
                </li>
              }
            </ul>
          </div>

          <!-- Track 2: Already using AI agents -->
          <div class="rounded-2xl border border-primary-200 bg-primary-50/50 p-8 dark:border-primary-800 dark:bg-primary-900/10">
            <h3 class="text-xl font-semibold text-surface-950">Already Using AI Agents?</h3>
            <p class="mt-2 text-sm text-surface-600">Here's what Prodara adds to your workflow:</p>
            <ul class="mt-6 space-y-4">
              @for (item of agentUserReasons; track item.title) {
                <li class="flex gap-3">
                  <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg>
                  <div>
                    <strong class="text-sm font-semibold text-surface-950">{{ item.title }}</strong>
                    <p class="text-sm text-surface-600">{{ item.desc }}</p>
                  </div>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ CODE EXAMPLE ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-50 py-20 sm:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-center text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
          See It in Action
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-center text-lg text-surface-600">
          A complete spec for a to-do app. Write it yourself - or let your AI agent write it for you.
        </p>
        <div class="mx-auto mt-12 max-w-3xl">
          <app-code-block [code]="fullExample" language="prd" filename="app.prd" />
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ TEMPLATES ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-surface-0 py-20 sm:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-center text-3xl font-bold tracking-tight text-surface-950 sm:text-4xl">
          Start from a Template
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-center text-lg text-surface-600">
          <code class="rounded-lg bg-surface-100 px-2 py-0.5 font-mono text-sm">prodara init</code>
          ships with 5 project templates. Pick one and start building in seconds.
        </p>

        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          @for (tpl of templates; track tpl.name) {
            <div class="rounded-2xl border border-surface-200 bg-surface-50 p-6 transition hover:border-primary-200 hover:shadow-lg">
              <span class="mb-2 inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {{ tpl.tag }}
              </span>
              <h3 class="text-lg font-semibold text-surface-950">{{ tpl.name }}</h3>
              <p class="mt-2 text-sm text-surface-600">{{ tpl.desc }}</p>
              <code class="mt-4 block rounded-lg bg-surface-100 px-3 py-2 font-mono text-xs text-surface-700">
                prodara init --template {{ tpl.id }}
              </code>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════ CTA ═══════════════════════ -->
    <section class="border-t border-surface-200 bg-gradient-to-b from-primary-600 to-primary-800 py-20 sm:py-28">
      <div class="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to build specs that actually compile?
        </h2>
        <p class="mt-4 text-lg text-primary-100">
          Install the VS Code extension, point your AI agent at a template, and get your first Product Graph in minutes.
        </p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            routerLink="/tutorials/quick-start"
            class="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50"
          >
            Start the Quick Start
            <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
          </a>
          <a
            href="https://github.com/prodara-ai/prodara"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent {
  readonly heroCode = `product task_board {
  title: "TaskBoard"
  version: "1.0"
  modules: [board]
}

module board {
  entity task {
    task_id: uuid
    title: string
    status: task_status = todo
    assignee: optional<user>
  }

  enum task_status { todo, in_progress, done }

  workflow create_task {
    capability: task_management
    authorization { user: [task.create] }
    writes { task }
    returns { ok: task }
  }

  surface board_view {
    kind: view
    title: "Task Board"
    binds: task
    actions: [do_create_task]
  }
}`;

  readonly fullExample = `product todo_app {
  title: "Todo App"
  version: "0.1.0"
  modules: [todo]
}

module todo {
  actor user { title: "User" }

  entity task {
    task_id: uuid
    title: string
    done: boolean = false
    created_at: datetime
  }

  workflow create_task {
    capability: task_management
    authorization { user: [task.create] }
    writes { task }
    returns { ok: task; error: task_error }
  }

  workflow toggle_task {
    capability: task_management
    reads { task }
    writes { task }
  }

  surface task_list {
    kind: view
    title: "Tasks"
    binds: task
    actions: [do_create_task, do_toggle_task]
  }

  test task_entity_exists {
    target: task
    expect { kind: "entity" }
  }
}`;

  readonly aiProviderNames = [
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

  readonly ecosystemPillars = [
    {
      icon: '&#x1F4DD;',
      title: 'Specification Language',
      desc: 'Declarative .prd files that describe entities, workflows, surfaces, governance, and 20+ other constructs - your full product definition in plain text.',
    },
    {
      icon: '&#x2699;&#xFE0F;',
      title: 'Compiler & CLI',
      desc: '13-phase compiler pipeline with type checking, semantic validation, and graph building. Produces deterministic Product Graphs, incremental plans, and AI-driven implementation.',
    },
    {
      icon: '&#x1F4BB;',
      title: 'VS Code Extension',
      desc: 'Syntax highlighting, real-time diagnostics via LSP, completions, document symbols, hover information, and go-to-definition. The best way to work with Prodara.',
    },
    {
      icon: '&#x1F916;',
      title: 'AI Agent Workflows',
      desc: '26+ supported agents with 29 slash commands, 5 interactive modes, and structured JSON output. Built to be driven by GitHub Copilot, Claude, Cursor, or any AI coding agent.',
    },
  ];

  readonly vscodeFeatures = [
    { title: 'Syntax Highlighting', desc: 'Rich semantic coloring for .prd files - keywords, types, identifiers, and string literals with a dedicated TextMate grammar.' },
    { title: 'Real-Time Diagnostics', desc: 'See compiler errors and warnings inline as you type, powered by the Prodara Language Server with 300ms debounced validation.' },
    { title: 'Smart Completions', desc: 'Context-aware autocomplete for all PRD keywords, type names, and cross-module references - triggered on "." and ":" characters.' },
    { title: 'Agent-Friendly', desc: 'Your AI coding agent (Copilot, Claude, Cursor, etc.) writes .prd files directly in VS Code with full LSP support, go-to-definition, and hover info.' },
    { title: 'One-Click Compile', desc: 'Build, validate, view the Product Graph, and show the incremental plan - all from VS Code commands.' },
  ];

  readonly howItWorks = [
    {
      num: '1',
      title: 'Describe Your Product',
      desc: 'Use the VS Code extension and your AI agent to write .prd specs. Describe entities, workflows, surfaces, governance, and more - or let your agent write it from a prompt. The init command auto-installs everything you need.',
      cmd: 'prodara init --template minimal',
    },
    {
      num: '2',
      title: 'Build & Implement',
      desc: 'The compiler validates your spec through 13 phases, then dispatches implementation tasks to your AI agent. In headless mode, agents build directly via API - no UI needed. Use --dry-run to preview tasks.',
      cmd: 'prodara build .',
    },
    {
      num: '3',
      title: 'Iterate & Ship',
      desc: 'Change the spec, rebuild, and see exactly what changed with semantic diffing and impact propagation. 9 built-in reviewers catch issues before they reach code.',
      cmd: 'prodara plan --format json .',
    },
  ];

  readonly newUserReasons = [
    { title: 'You don\'t need to learn the language', desc: 'Your AI agent (Copilot, Claude, Cursor) writes the .prd specs for you. Focus on what your product does, not syntax.' },
    { title: 'Real compiler, real errors', desc: 'Not a linter on top of markdown - a full lexer/parser/binder/type-checker that catches mistakes before they reach code. 900+ stable error codes.' },
    { title: 'VS Code extension included', desc: 'Install the extension and get syntax highlighting, inline diagnostics, completions, go-to-definition, and hover info from day one.' },
    { title: 'Spec-native testing', desc: 'Write expect blocks right inside your spec. Test transitions, authorization, validation rules, and return types - directly against the Product Graph.' },
  ];

  readonly agentUserReasons = [
    { title: 'Deterministic builds', desc: 'Same spec always produces the same Product Graph. No hallucinated drift between runs - verified by SHA-256 hashing.' },
    { title: 'Compiler-validated specs', desc: 'A full 13-phase compiler catches mistakes before they reach generated code. Suggested fixes let agents self-correct in a loop.' },
    { title: 'Semantic diffing & impact analysis', desc: 'When you change a spec, Prodara traces 40+ edge types to tell you exactly which downstream artifacts need updating - with depth tracking.' },
    { title: 'Governance as code', desc: 'Constitutions enforce security, privacy, and compliance policies. 9 built-in reviewers plus custom reviewers catch issues automatically.' },
  ];

  readonly templates = [
    { id: 'minimal', name: 'Minimal', tag: 'Recommended', desc: 'Single entity, one file. Perfect for learning Prodara basics.' },
    { id: 'saas', name: 'SaaS', tag: 'Popular', desc: 'Authentication + billing with Stripe integration patterns.' },
    { id: 'marketplace', name: 'Marketplace', tag: 'Full-stack', desc: 'Users, listings, orders - a complete marketplace spec.' },
    { id: 'internal-tool', name: 'Internal Tool', tag: 'Enterprise', desc: 'Admin dashboards and task management for internal teams.' },
    { id: 'api', name: 'API', tag: 'Backend', desc: 'API keys, resources, and rate limiting patterns.' },
  ];

  copyInstall(): void {
    navigator.clipboard.writeText('npm install -g @prodara/cli');
  }
}
