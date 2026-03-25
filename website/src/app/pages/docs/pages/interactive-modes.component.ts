import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-interactive-modes',
  imports: [RouterLink, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Interactive Modes</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara provides five interactive modes that your AI agent uses to investigate,
        explain, discuss, design, and onboard. Each mode is triggered via a
        <a routerLink="/docs/slash-commands" class="text-primary-600 hover:underline">AI prompt</a>
        and produces structured context that the agent weaves into its response.
      </p>

      <!-- Modes overview -->
      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 not-prose">
        @for (mode of modes; track mode.command) {
          <div class="rounded-xl border border-surface-200 bg-surface-50 p-5 transition hover:border-primary-300 hover:shadow-md">
            <p class="text-2xl">{{ mode.icon }}</p>
            <h3 class="mt-2 text-base font-semibold text-surface-950">{{ mode.name }}</h3>
            <p class="mt-1 text-sm text-surface-500">{{ mode.short }}</p>
            <code class="mt-3 block text-xs font-mono text-primary-700">{{ mode.command }}</code>
          </div>
        }
      </div>

      <!-- Explore Mode -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Explore Mode</h2>
      <p class="mt-2 text-surface-600">
        Explore mode performs a <strong>read-only</strong> investigation of a topic in the
        product graph. The agent gathers related nodes, edges, diagnostics, and test results
        without modifying anything. Use it to understand how a feature connects to the rest
        of the system.
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li>Traverses graph edges to find related modules, entities, and workflows</li>
        <li>Includes any diagnostics touching the explored nodes</li>
        <li>Shows spec test coverage for the selected area</li>
        <li>Returns structured JSON the agent uses to explain the topic</li>
      </ul>

      <!-- Help Mode -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Help Mode</h2>
      <p class="mt-2 text-surface-600">
        Help mode provides <strong>contextual guidance</strong> based on the current project state.
        Rather than generic documentation, it looks at what you've built so far — your modules,
        your diagnostics, your coverage gaps — and gives targeted advice on what to do next.
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li>Analyzes your current graph for missing pieces</li>
        <li>Suggests the next logical spec additions</li>
        <li>Points to specific documentation sections</li>
        <li>Recommends reviewers and tests to run</li>
      </ul>

      <!-- Party Mode -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Party Mode</h2>
      <p class="mt-2 text-surface-600">
        Party mode kicks off a <strong>multi-perspective discussion</strong> about a topic.
        Each built-in reviewer agent contributes its unique perspective — the security reviewer
        flags risks, the UX reviewer suggests usability improvements, the architecture reviewer
        evaluates structural impact, and so on.
      </p>
      <app-callout variant="tip">
        Party mode is great for design decisions. Run
        <code>/prodara party "should we split billing into its own module?"</code>
        and get feedback from all reviewer perspectives at once.
      </app-callout>

      <!-- Design Mode -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Design Mode</h2>
      <p class="mt-2 text-surface-600">
        Design mode generates a <strong>structured design document</strong> for a proposed
        feature or change. It outlines the entities, workflows, surfaces, and governance
        rules needed, along with impact analysis against the existing graph.
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li>Produces a module-level design with all node kinds</li>
        <li>Includes dependency analysis against the existing graph</li>
        <li>Flags potential conflicts with existing specs</li>
        <li>Generates a design doc the agent can iterate on</li>
      </ul>

      <!-- Onboard Mode -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Onboard Mode</h2>
      <p class="mt-2 text-surface-600">
        Onboard mode creates an <strong>interactive walkthrough</strong> of the project for
        new team members. It surveys the module structure, key workflows, governance rules,
        and current state — then produces a structured guide the agent presents step by step.
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li>Shows the module hierarchy and entity relationships</li>
        <li>Highlights key workflows and their authorization rules</li>
        <li>Summarizes governance policies and constitution</li>
        <li>Includes links to relevant spec tests and documentation</li>
      </ul>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Triggering Interactive Modes</h2>
      <p class="mt-2 text-surface-600">
        All interactive modes are invoked via the
        <a routerLink="/docs/slash-commands" class="text-primary-600 hover:underline">AI prompt file</a>
        that is generated when you run <code>prodara init --ai &lt;agent&gt;</code>.
        The agent reads the prompt, gathers context from the compiler, and
        presents the results in natural language.
      </p>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        Try
        <a routerLink="/docs/customization" class="text-primary-600 hover:underline">customizing reviewers</a>
        to control which perspectives appear in Party mode, or define
        <a routerLink="/docs/workflows" class="text-primary-600 hover:underline">custom workflows</a>
        that combine interactive modes with build phases.
      </p>
    </article>
  `,
})
export class InteractiveModesComponent {
  readonly modes = [
    { icon: '🔍', name: 'Explore', command: '/prodara explore <topic>', short: 'Read-only investigation of a topic in the product graph.' },
    { icon: '💡', name: 'Help', command: '/prodara help', short: 'Contextual guidance based on current project state.' },
    { icon: '🎉', name: 'Party', command: '/prodara party <topic>', short: 'Multi-perspective discussion from all reviewer agents.' },
    { icon: '📐', name: 'Design', command: '/prodara design <feature>', short: 'Structured design document for a proposed feature.' },
    { icon: '👋', name: 'Onboard', command: '/prodara onboard', short: 'Interactive project walkthrough for new team members.' },
  ];
}
