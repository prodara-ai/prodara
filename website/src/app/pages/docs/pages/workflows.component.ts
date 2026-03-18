import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-workflows',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Custom Workflows</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara workflows orchestrate how the AI agent interacts with the compiler. The default
        workflow covers the full specify → clarify → plan → implement → review cycle, but you
        can customize it or define entirely new workflows.
      </p>

      <!-- Default Workflow -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Default Workflow</h2>
      <p class="mt-2 text-surface-600">
        When you run <code>prodara build</code>, the engine executes these phases in order:
      </p>
      <div class="mt-6 space-y-3 not-prose">
        @for (phase of defaultPhases; track phase.name) {
          <div class="flex gap-4 rounded-lg border border-surface-200 bg-surface-50 p-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30">{{ phase.num }}</span>
            <div>
              <p class="font-medium text-surface-950">{{ phase.name }}</p>
              <p class="mt-1 text-sm text-surface-500">{{ phase.desc }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Phase Kinds -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Phase Kinds</h2>
      <p class="mt-2 text-surface-600">
        Each workflow step maps to a <code>PhaseKind</code>. The engine exports
        individual runner functions for each kind:
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Kind</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Runner</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Output Type</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (kind of phaseKinds; track kind.kind) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ kind.kind }}</td>
                <td class="py-2 font-mono text-sm">{{ kind.runner }}</td>
                <td class="py-2 font-mono text-sm">{{ kind.output }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Custom Workflow -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Defining Custom Workflows</h2>
      <p class="mt-2 text-surface-600">
        Define a custom workflow in your <code>prodara.config.json</code> using the
        <code>WorkflowSchema</code> structure. Each step specifies a phase kind and
        optional configuration.
      </p>
      <app-code-block [code]="customWorkflow" language="json" filename="prodara.config.json" />

      <app-callout variant="tip">
        Use the <code>--workflow</code> CLI flag to select a named workflow:
        <code>prodara build --workflow quick-check</code>
      </app-callout>

      <!-- Review Gates -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Review Gates</h2>
      <p class="mt-2 text-surface-600">
        Review gates are special workflow steps that run the reviewer pipeline.
        You can configure which reviewers run and how many fix attempts are allowed.
      </p>
      <app-code-block [code]="reviewGates" language="json" filename="prodara.config.json (workflow section)" />

      <!-- Clarify Phase -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Clarify Phase</h2>
      <p class="mt-2 text-surface-600">
        The clarify phase identifies ambiguities in the specification and produces
        structured questions. Auto-resolution can answer common questions automatically.
      </p>
      <app-code-block [code]="clarifyConfig" language="json" filename="clarify config" />

      <!-- Programmatic API -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Programmatic API</h2>
      <p class="mt-2 text-surface-600">
        Run workflows programmatically using the <code>runWorkflow()</code> function
        or execute individual phases:
      </p>
      <app-code-block [code]="apiExample" language="typescript" />

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        See the
        <a routerLink="/tutorials/interactive-workflows" class="text-primary-600 hover:underline">Interactive Workflows</a>
        tutorial to build a custom workflow from scratch. Read about
        <a routerLink="/docs/interactive-modes" class="text-primary-600 hover:underline">interactive modes</a>
        like Explore, Help, and Party.
      </p>
    </article>
  `,
})
export class WorkflowsComponent {
  readonly defaultPhases = [
    { num: '1', name: 'Specify', desc: 'Parse the full specification and build the product graph.' },
    { num: '2', name: 'Clarify', desc: 'Identify ambiguities and produce structured questions.' },
    { num: '3', name: 'Plan', desc: 'Diff against the previous build and generate an incremental plan.' },
    { num: '4', name: 'Tasks', desc: 'Break the plan into ordered, actionable tasks.' },
    { num: '5', name: 'Analyze', desc: 'Run consistency and metrics analysis across tasks.' },
    { num: '6', name: 'Implement', desc: 'Generate implementation instructions for each task.' },
    { num: '7', name: 'Review', desc: 'Run the reviewer pipeline with configured reviewers.' },
  ];

  readonly phaseKinds = [
    { kind: 'specify', runner: 'runSpecifyPhase()', output: 'SpecifyOutput' },
    { kind: 'clarify', runner: 'runClarifyPhase()', output: 'ClarifyOutput' },
    { kind: 'plan', runner: 'runPlanPhase()', output: 'PlanOutput' },
    { kind: 'tasks', runner: 'runTasksPhase()', output: 'TasksOutput' },
    { kind: 'analyze', runner: 'runAnalyzePhase()', output: 'AnalyzeOutput' },
    { kind: 'implement', runner: 'runImplementPhase()', output: 'ImplementOutput' },
  ];

  readonly customWorkflow = `{
  "workflows": {
    "quick-check": {
      "steps": [
        { "phase": "specify" },
        { "phase": "clarify", "autoResolve": true }
      ]
    },
    "full-review": {
      "steps": [
        { "phase": "specify" },
        { "phase": "clarify" },
        { "phase": "plan" },
        { "phase": "tasks" },
        { "phase": "analyze" },
        { "phase": "implement" },
        { "phase": "review", "reviewers": ["architecture", "security", "quality"] }
      ]
    }
  }
}`;

  readonly reviewGates = `{
  "review": {
    "maxFixAttempts": 3,
    "reviewers": ["architecture", "quality", "security"],
    "fixLoop": {
      "severity": "error",
      "autoFix": true
    }
  }
}`;

  readonly clarifyConfig = `{
  "clarify": {
    "maxQuestions": 10,
    "priority": "high",
    "ambiguityThreshold": "medium",
    "autoResolve": true
  }
}`;

  readonly apiExample = `import {
  runWorkflow,
  runSpecifyPhase,
  runClarifyPhase,
  runPlanPhase,
} from '@prodara/compiler';

// Run the full workflow
const result = await runWorkflow({ rootDir: './project' });

// Or run individual phases
const specResult = await runSpecifyPhase(config);
const clarifyResult = await runClarifyPhase(specResult, config);
const planResult = await runPlanPhase(specResult, config);`;
}
