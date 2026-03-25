import { Component } from '@angular/core';

@Component({
  selector: 'app-glossary',
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Glossary</h1>
      <p class="mt-4 text-lg text-surface-600">
        Key terms and concepts in the Prodara ecosystem.
      </p>

      <div class="mt-12 space-y-8">
        @for (term of terms; track term.word) {
          <div [id]="term.anchor" class="scroll-mt-24">
            <h2 class="text-lg font-semibold text-surface-950">{{ term.word }}</h2>
            <p class="mt-1 text-sm leading-relaxed text-surface-600">{{ term.def }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class GlossaryComponent {
  readonly terms = [
    { word: 'Actor', anchor: 'actor', def: 'A user role or system identity that interacts with the product. Actors are granted permissions through capabilities and authorized to execute specific workflows.' },
    { word: 'AI Agent Workflow', anchor: 'ai-agent-workflow', def: 'The iterative loop where an AI agent writes .prd files, compiles them with the CLI, reads diagnostics, applies fixes, and repeats until the spec is clean. The primary way most users create Prodara specs. Supported by 26+ AI coding agents.' },
    { word: 'Binder', anchor: 'binder', def: 'The compiler phase (phase 4) that creates a symbol table, linking declarations to scopes and resolving cross-references between modules. Detects duplicate declarations and ambiguous imports.' },
    { word: 'Capability', anchor: 'capability', def: 'A grouping of related permissions that actors can be granted. Capabilities connect actors to the workflows they are authorized to execute.' },
    { word: 'Constitution', anchor: 'constitution', def: 'A governance construct that defines policies for code generation, security, testing, and code style. Constitutions stack in three layers (registry, product, module) with more specific layers overriding general ones.' },
    { word: 'Design Tokens', anchor: 'design-tokens', def: 'Named values for colors, spacing, typography, and breakpoints defined in tokens blocks. Tokens provide a consistent design vocabulary shared across all surfaces and renderings.' },
    { word: 'DiagnosticBag', anchor: 'diagnostic-bag', def: 'The shared accumulator for all compiler errors, warnings, and info messages across all phases. Diagnostics are never thrown as exceptions, and each includes stable error codes (PRD0001-0899).' },
    { word: 'Entity', anchor: 'entity', def: 'A persistent domain object with identity and fields. Entities form the backbone of the data model and are referenced by workflows, surfaces, and rules. Entity lifecycle is modeled through enum states and workflow transitions.' },
    { word: 'Extension', anchor: 'extension', def: 'A plugin that adds capabilities to Prodara. Extensions can provide reviewers, generators, validators, phases, or templates. Distributed as npm packages and installable via the CLI.' },
    { word: 'Impact Propagation', anchor: 'impact-propagation', def: 'The process of tracing graph edges outward from a changed node to identify all downstream nodes that may be affected. Each impacted node includes depth, reason, and the edge kind that carried the impact.' },
    { word: 'Incremental Spec', anchor: 'incremental-spec', def: 'An enriched plan that adds node metadata and organizes tasks into six category slices (backend, frontend, api, runtime, schema, test) for targeted code generation.' },
    { word: 'LSP', anchor: 'lsp', def: 'Language Server Protocol - the VS Code extension uses an LSP server to provide real-time diagnostics, completions, hover information, go-to-definition, find references, and document symbol navigation for .prd files.' },
    { word: 'Module', anchor: 'module', def: 'A bounded domain container grouping related entities, workflows, surfaces, and rules. Modules map to DDD-style bounded contexts and support cross-module imports with aliasing.' },
    { word: 'Plan', anchor: 'plan', def: 'An incremental artifact produced by diffing two Product Graphs. Plans classify changes into 6 kinds (added, removed, renamed, structurally/behaviorally/policy changed), track impact propagation, and generate actionable tasks.' },
    { word: 'Preset', anchor: 'preset', def: 'A composable configuration template that bundles multiple settings, reviewers, and policies into a reusable package. Presets can be shared across projects and teams.' },
    { word: 'Product', anchor: 'product', def: 'The top-level declaration in a .prd file. A product has a name, version, title, and lists all its constituent modules. Each spec has exactly one product declaration.' },
    { word: 'Product Graph', anchor: 'product-graph', def: 'The canonical compiled output - a deterministic JSON structure containing all product nodes, typed edges (40+ kinds), and build metadata. The graph is SHA-256 verified and serves as the single source of truth for AI agents and generators.' },
    { word: 'Proposal', anchor: 'proposal', def: 'An isolated change management artifact that stages spec modifications in their own directory. Proposals follow a lifecycle (draft, open, approved, applied, rejected, archived) and include motivation, scope, and delta.prd files.' },
    { word: 'Rendering', anchor: 'rendering', def: 'A construct that defines how a surface is visually laid out. Renderings specify layout direction, grid structure, placement, styles, and responsive breakpoints.' },
    { word: 'Reviewer', anchor: 'reviewer', def: 'An automated quality checker that evaluates the Product Graph against specific criteria. Prodara includes 9 built-in reviewers (architecture, security, code quality, test quality, UX, specification, adversarial, edge case) plus support for custom reviewers.' },
    { word: 'Rule', anchor: 'rule', def: 'A business constraint that is enforced across workflows and surfaces. Rules specify an entity, a condition expression, and an error message. They are validated by the compiler and referenced in workflows and surface validation.' },
    { word: 'Semantic Diffing', anchor: 'semantic-diffing', def: 'The process of comparing two Product Graphs to identify structural, behavioral, and policy changes with downstream impact propagation. Goes beyond text diffing to understand the semantic meaning of changes.' },
    { word: 'AI Prompt', anchor: 'ai-prompt', def: 'A single prompt file generated by prodara init --ai that teaches your AI agent the complete 8-phase Prodara lifecycle — from specification to deployment.' },
    { word: 'Surface', anchor: 'surface', def: 'An interaction boundary (view, form, dashboard, page, modal, component) that connects users and systems to the product\'s workflows and data. Surfaces are platform-agnostic and describe structure, not visual layout.' },
    { word: 'Value Object', anchor: 'value-object', def: 'A structured type without identity, compared by value rather than reference. Used for addresses, money, coordinates, and other composite types that don\'t have their own lifecycle.' },
    { word: 'VS Code Extension', anchor: 'vscode-extension', def: 'The official Prodara extension for Visual Studio Code providing syntax highlighting (TextMate grammar), real-time diagnostics via LSP, completions, go-to-definition, hover info, document symbols, and editor commands for build/validate/graph/plan.' },
    { word: 'Workflow', anchor: 'workflow', def: 'A behavior definition that specifies capability, authorization, I/O contracts, execution steps (call, decide, fail), state transitions, and side effects (audit, emit, notify). Workflows can be triggered by events or schedules.' },
    { word: 'Workflow Engine', anchor: 'workflow-engine', def: 'The 6-phase deterministic processing system that runs after compilation: specify, clarify, plan, tasks, analyze, and implement. Custom workflows can reorder or subset these phases.' },
  ];
}
