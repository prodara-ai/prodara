import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-architecture',
  imports: [RouterLink, CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Compiler Architecture</h1>
      <p class="mt-4 text-lg text-surface-600">
        The Prodara compiler processes <code>.prd</code> source files through 15 distinct phases,
        producing a deterministic Product Graph. Each phase is a separate module with typed
        inputs and outputs.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Design Principles</h2>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><strong>Phase Separation</strong> - Each phase has a single responsibility and typed contract</li>
        <li><strong>Diagnostic Accumulation</strong> - Errors are collected in a DiagnosticBag, never thrown as exceptions</li>
        <li><strong>Deterministic Output</strong> - Same input always produces the same graph (except <code>compiled_at</code>)</li>
        <li><strong>Agent-Friendly</strong> - All output is structured JSON with stable contracts</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">The 15 Phases</h2>
      <div class="mt-6 space-y-4">
        @for (phase of phases; track phase.name) {
          <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
            <div class="flex items-baseline gap-3">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{{ phase.num }}</span>
              <h3 class="font-semibold text-surface-950">{{ phase.name }}</h3>
            </div>
            <p class="mt-2 text-sm text-surface-600">{{ phase.desc }}</p>
          </div>
        }
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Semantic Node IDs</h2>
      <p class="mt-2 text-surface-600">
        Every node in the Product Graph has a stable semantic ID following the pattern:
      </p>
      <app-code-block code="<module>.<kind>.<name>\n\n// Examples:\ncore.entity.user\nbilling.workflow.create_invoice\nauth.surface.login_form" language="text" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Build State</h2>
      <p class="mt-2 text-surface-600">
        The compiler persists build state in a <code>.prodara/</code> directory for incremental compilation.
        This includes the previous graph, plan artifacts, and build metadata.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Beyond Compilation</h2>
      <p class="mt-2 text-surface-600">
        After the core 15-phase pipeline, Prodara runs additional high-level phases:
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><strong class="text-surface-900">Workflow Engine</strong> - Orchestrates specify → clarify → plan → implement cycles. See <a routerLink="/docs/workflows" class="text-primary-600 hover:underline">Custom Workflows</a>.</li>
        <li><strong class="text-surface-900">Reviewer Pipeline</strong> - 9 built-in reviewer agents inspect the plan from different perspectives. See <a routerLink="/docs/customization" class="text-primary-600 hover:underline">Reviewers &amp; Constitution</a>.</li>
        <li><strong class="text-surface-900">Extension System</strong> - Custom generators, validators, and reviewers loaded at build time. See <a routerLink="/docs/extensions" class="text-primary-600 hover:underline">Extensions &amp; Presets</a>.</li>
        <li><strong class="text-surface-900">Proposal System</strong> - Stage changes in isolation for review. See <a routerLink="/docs/proposals" class="text-primary-600 hover:underline">Proposals &amp; Changes</a>.</li>
      </ul>
    </article>
  `,
})
export class ArchitectureComponent {
  readonly phases = [
    { num: 1, name: 'Discovery', desc: 'Scans the file system for .prd source files and resolves module relationships.' },
    { num: 2, name: 'Lexer', desc: 'Tokenizes source text into a stream of typed tokens (keywords, identifiers, literals, punctuation).' },
    { num: 3, name: 'Parser', desc: 'Builds an Abstract Syntax Tree (AST) from the token stream.' },
    { num: 4, name: 'Binder', desc: 'Creates a symbol table linking declarations to their scopes and resolving references.' },
    { num: 5, name: 'Type Checker', desc: 'Validates type compatibility across fields, workflows, and references.' },
    { num: 6, name: 'Graph Builder', desc: 'Constructs the Product Graph from the bound and type-checked AST.' },
    { num: 7, name: 'Planner', desc: 'Diffs graphs and produces incremental plans with impact propagation.' },
    { num: 8, name: 'Spec Test Runner', desc: 'Executes specification-level tests against the Product Graph.' },
    { num: 9, name: 'Runtime Resolution', desc: 'Resolves runtime configurations and environment-specific settings.' },
    { num: 10, name: 'Build State', desc: 'Manages persistent build state for incremental compilation.' },
    { num: 11, name: 'Generator Contracts', desc: 'Produces typed contracts for downstream code generators.' },
    { num: 12, name: 'Graph Validator', desc: 'Validates structural integrity and semantic rules of the Product Graph.' },
    { num: 13, name: 'Registry Resolution', desc: 'Resolves external packages and presets from the registry.' },
    { num: 14, name: 'Build Orchestration', desc: 'Coordinates the full build pipeline and produces the final BuildSummary.' },
    { num: 15, name: 'Configuration', desc: 'Manages compiler configuration and feature flags.' },
  ];
}
