import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';
import { CalloutComponent } from '../../components/callout.component';

@Component({
  selector: 'app-interactive-workflows-tutorial',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        Intermediate &middot; ~15 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Interactive Workflows</h1>
      <p class="mt-4 text-lg text-surface-600">
        Define custom workflows that combine build phases, review gates, and interactive modes.
        Build a "design review" workflow that uses Explore, Party, and Review in sequence.
      </p>

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
      <section class="mt-14" id="default">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">1</span>
          Understand the Default Workflow
        </h2>
        <p class="mt-4 text-surface-600">
          By default, <code>prodara build</code> runs all 7 phases in order:
          <strong>specify → clarify → plan → tasks → analyze → implement → review</strong>.
          Custom workflows let you run a subset or reorder them.
        </p>
        <app-callout variant="info">
          Each phase has a typed output. See the
          <a routerLink="/docs/workflows" class="underline">Custom Workflows</a> reference for
          all phase kinds and their output types.
        </app-callout>
      </section>

      <!-- Step 2 -->
      <section class="mt-14" id="quick-check">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">2</span>
          Create a Quick-Check Workflow
        </h2>
        <p class="mt-4 text-surface-600">
          Start with a simple workflow that only runs specify and clarify — useful for fast
          feedback during spec authoring:
        </p>
        <app-code-block [code]="quickCheck" language="json" filename="prodara.config.json" />
        <p class="mt-4 text-surface-600">
          Run it with the <code>--workflow</code> flag:
        </p>
        <app-code-block code="prodara build --workflow quick-check ." language="bash" />
      </section>

      <!-- Step 3 -->
      <section class="mt-14" id="design-review">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">3</span>
          Build a Design Review Workflow
        </h2>
        <p class="mt-4 text-surface-600">
          Now create a more sophisticated workflow that combines specification, planning, and
          review with specific reviewer selection:
        </p>
        <app-code-block [code]="designReview" language="json" filename="prodara.config.json" />
        <p class="mt-4 text-surface-600">
          This workflow skips implementation and only reviews architecture and security.
          Use it when evaluating design changes before committing to implementation.
        </p>
      </section>

      <!-- Step 4 -->
      <section class="mt-14" id="fix-loop">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">4</span>
          Configure the Fix Loop
        </h2>
        <p class="mt-4 text-surface-600">
          The review phase includes an automatic fix loop. Configure how many attempts
          the agent gets and which severity levels trigger fixes:
        </p>
        <app-code-block [code]="fixLoop" language="json" filename="prodara.config.json (reviewFix section)" />
        <app-callout variant="tip">
          Set <code>"autoFix": false</code> to get review findings without automatic
          fix attempts — useful for manual review workflows.
        </app-callout>
      </section>

      <!-- Step 5 -->
      <section class="mt-14" id="programmatic">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">5</span>
          Run Workflows Programmatically
        </h2>
        <p class="mt-4 text-surface-600">
          Use the <code>runWorkflow()</code> API or run individual phases for maximum control:
        </p>
        <app-code-block [code]="programmatic" language="typescript" filename="custom-pipeline.ts" />
      </section>

      <div class="mt-14 rounded-2xl border border-primary-200 bg-primary-50/50 p-6 dark:border-primary-800 dark:bg-primary-900/10">
        <h2 class="text-lg font-semibold text-surface-950">Next Steps</h2>
        <ul class="mt-3 space-y-2 text-sm text-surface-600">
          <li>Read the full <a routerLink="/docs/workflows" class="text-primary-600 hover:underline">Custom Workflows</a> reference</li>
          <li>Try <a routerLink="/docs/interactive-modes" class="text-primary-600 hover:underline">interactive modes</a> like Explore, Help, and Party</li>
          <li>Add <a routerLink="/tutorials/custom-reviewers" class="text-primary-600 hover:underline">custom reviewers</a> to your workflow</li>
        </ul>
      </div>
    </div>
  `,
})
export class InteractiveWorkflowsTutorialComponent {
  readonly steps = [
    { num: '1', anchor: 'default', label: 'Understand the Default Workflow' },
    { num: '2', anchor: 'quick-check', label: 'Create a Quick-Check Workflow' },
    { num: '3', anchor: 'design-review', label: 'Build a Design Review Workflow' },
    { num: '4', anchor: 'fix-loop', label: 'Configure the Fix Loop' },
    { num: '5', anchor: 'programmatic', label: 'Run Workflows Programmatically' },
  ];

  readonly quickCheck = `{
  "workflows": {
    "quick-check": {
      "steps": [
        { "phase": "specify" },
        { "phase": "clarify", "autoResolve": true }
      ]
    }
  }
}`;

  readonly designReview = `{
  "workflows": {
    "design-review": {
      "steps": [
        { "phase": "specify" },
        { "phase": "clarify" },
        { "phase": "plan" },
        { "phase": "analyze" },
        {
          "phase": "review",
          "reviewers": ["architecture", "security"]
        }
      ]
    }
  }
}`;

  readonly fixLoop = `{
  "reviewFix": {
    "maxAttempts": 5,
    "severity": "warning",
    "autoFix": true
  }
}`;

  readonly programmatic = `import {
  runWorkflow,
  runSpecifyPhase,
  runClarifyPhase,
  autoResolveClarifications,
} from '@prodara/compiler';

// Run a named workflow
const result = await runWorkflow({
  rootDir: './project',
  workflow: 'design-review',
});

// Or compose phases manually
const spec = await runSpecifyPhase(config);
const clarify = await runClarifyPhase(spec, config);
const resolved = autoResolveClarifications(clarify);

console.log(\`Resolved \${resolved.length} clarifications\`);`;
}
