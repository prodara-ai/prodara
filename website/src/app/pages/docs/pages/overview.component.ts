import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-docs-overview',
  imports: [RouterLink],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Prodara Documentation</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara is an AI-native product specification ecosystem. Write declarative <code>.prd</code> files
        that describe your software product - entities, workflows, screens, permissions, governance -
        and the compiler validates everything, then outputs a deterministic
        <strong>Product Graph</strong> that AI coding agents consume directly.
      </p>

      <!-- Ecosystem overview -->
      <div class="mt-8 rounded-xl border border-primary-200 bg-primary-50/50 p-6 not-prose dark:border-primary-800 dark:bg-primary-900/10">
        <h2 class="text-lg font-semibold text-surface-950">The Prodara Ecosystem</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="flex gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm dark:bg-primary-900/30">📝</div>
            <div>
              <p class="text-sm font-medium text-surface-950">Specification Language</p>
              <p class="text-xs text-surface-500">Declarative .prd files for product modeling</p>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm dark:bg-primary-900/30">⚙️</div>
            <div>
              <p class="text-sm font-medium text-surface-950">Compiler &amp; CLI</p>
              <p class="text-xs text-surface-500">13-phase pipeline with JSON output</p>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm dark:bg-primary-900/30">💻</div>
            <div>
              <p class="text-sm font-medium text-surface-950">VS Code Extension</p>
              <p class="text-xs text-surface-500">Syntax highlighting, real-time diagnostics, LSP</p>
            </div>
          </div>
          <div class="flex gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm dark:bg-primary-900/30">🤖</div>
            <div>
              <p class="text-sm font-medium text-surface-950">AI Agent Workflows</p>
              <p class="text-xs text-surface-500">Works with GitHub Copilot, Claude, Cursor &amp; more</p>
            </div>
          </div>
        </div>
      </div>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Quick Navigation</h2>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 not-prose">
        @for (card of cards; track card.path) {
          <a
            [routerLink]="card.path"
            class="block rounded-xl border border-surface-200 bg-surface-50 p-5 transition hover:border-primary-300 hover:shadow-md"
          >
            <h3 class="text-base font-semibold text-surface-950">{{ card.title }}</h3>
            <p class="mt-1 text-sm text-surface-500">{{ card.desc }}</p>
          </a>
        }
      </div>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Design Goals</h2>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><strong class="text-surface-900">Human-readable</strong> - Plain text specs that anyone on the team can understand - product managers, designers, and engineers</li>
        <li><strong class="text-surface-900">AI-native</strong> - Built for AI agents: non-interactive CLI, JSON output, stable contracts, suggested fixes, and 29 slash commands</li>
        <li><strong class="text-surface-900">Deterministic</strong> - Same input always produces the exact same Product Graph (SHA-256 verified)</li>
        <li><strong class="text-surface-900">Git-friendly</strong> - Merge specs like code, track changes over time, and use proposals for isolated change management</li>
        <li><strong class="text-surface-900">Governance-first</strong> - Constitution-governed generation with security, privacy, compliance, and code style policies at three stacking layers</li>
        <li><strong class="text-surface-900">Editor-integrated</strong> - VS Code extension with syntax highlighting, real-time diagnostics, completions, hover, go-to-definition, and document symbols via LSP</li>
        <li><strong class="text-surface-900">Incrementally buildable</strong> - Semantic diffing and impact propagation mean only changed artifacts are regenerated</li>
      </ul>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Language Constructs</h2>
      <p class="mt-2 text-surface-600">
        The Prodara specification language supports 30+ declaration types for modeling every aspect of your product:
      </p>
      <div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 not-prose">
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Domain:</strong> entity, value, enum, rule</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Behavior:</strong> workflow, action, event, schedule</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>UI/Surface:</strong> surface, rendering, tokens, theme</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Users:</strong> actor, capability</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Data:</strong> serialization, storage, strings</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Infra:</strong> integration, transport, execution</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Governance:</strong> constitution, security, privacy, validation</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Runtime:</strong> secret, environment, deployment</div>
        <div class="rounded-lg bg-surface-100 px-3 py-2 text-sm text-surface-700"><strong>Quality:</strong> test, extension, product_ref</div>
      </div>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        New to Prodara? Start with the
        <a routerLink="/tutorials/quick-start" class="text-primary-600 hover:underline">Quick Start tutorial</a>
        — run <code>prodara init</code>, open your IDE, and type <code>&#64;prodara</code> to start building.
        Or explore the
        <a routerLink="/docs/architecture" class="text-primary-600 hover:underline">Architecture guide</a>
        to understand the 13-phase compiler pipeline.
      </p>
    </article>
  `,
})
export class DocsOverviewComponent {
  readonly cards = [
    { path: '/docs/architecture', title: 'Architecture', desc: 'The 13-phase compiler pipeline, from source discovery to build orchestration.' },
    { path: '/docs/configuration', title: 'Configuration', desc: 'Configure the compiler, reviewers, workflows, and more via prodara.config.json.' },
    { path: '/docs/product-graph', title: 'Product Graph', desc: 'The canonical JSON output with 40+ typed edge relationships.' },
    { path: '/docs/diagnostics', title: 'Diagnostics', desc: 'Structured error codes, severities, and suggested fixes.' },
    { path: '/docs/agent-integration', title: 'AI Agent Integration', desc: '26+ supported agents with slash commands and structured JSON output.' },
    { path: '/docs/slash-commands', title: 'Slash Commands', desc: '29 slash commands in 4 categories for AI agent workflows.' },
    { path: '/docs/interactive-modes', title: 'Interactive Modes', desc: 'Explore, Help, Party, Design, and Onboard modes for AI agents.' },
    { path: '/docs/customization', title: 'Reviewers & Constitution', desc: '9 built-in reviewers, custom reviewers, and constitution governance.' },
    { path: '/docs/extensions', title: 'Extensions & Presets', desc: 'Plugin system with marketplace, 5 capability kinds, and shareable presets.' },
    { path: '/docs/proposals', title: 'Proposals & Changes', desc: 'Stage specification changes in isolation with full review feedback.' },
    { path: '/docs/workflows', title: 'Custom Workflows', desc: 'Define workflow pipelines with review gates and custom phase sequences.' },
    { path: '/docs/language/entities', title: 'Entities & Fields', desc: 'Persistent domain objects with fields, types, and relationships.' },
    { path: '/docs/language/workflows', title: 'Workflows', desc: 'Business logic, authorization, steps, transitions, and effects.' },
    { path: '/docs/cli-usage', title: 'CLI Usage', desc: '13 commands: build, init, validate, graph, plan, test, review, propose, and more.' },
    { path: '/docs/api-reference', title: 'API Reference', desc: 'Programmatic access to 200+ functions via @prodara/compiler.' },
  ];
}
