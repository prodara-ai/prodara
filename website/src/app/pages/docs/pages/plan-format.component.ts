import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-plan-format',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Plan Format</h1>
      <p class="mt-4 text-lg text-surface-600">
        Plans are incremental artifacts produced by comparing two Product Graphs. They list
        node-level changes, transitive impact propagation, and actionable tasks for generators.
        Plans are the bridge between <em>what changed</em> in your spec and <em>what needs to happen</em> in your codebase.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Plan Structure</h2>
      <p class="mt-2 text-surface-600">
        A plan is a JSON artifact with three top-level sections: changes, impacts, and tasks.
      </p>
      <app-code-block [code]="planExample" language="json" filename="plan.json" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Change Kinds</h2>
      <p class="mt-2 text-surface-600">
        The compiler classifies every node difference into one of six change kinds:
      </p>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Kind</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Example</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">added</td><td class="py-2">New node in the current graph</td><td class="py-2">A new entity was declared</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">removed</td><td class="py-2">Node present in previous but not current</td><td class="py-2">A workflow was deleted</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">renamed</td><td class="py-2">Node identity changed</td><td class="py-2">Entity renamed from <code>task</code> to <code>ticket</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">structurally_changed</td><td class="py-2">Fields, types, or shape modified</td><td class="py-2">A field type changed from <code>string</code> to <code>integer</code></td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">behaviorally_changed</td><td class="py-2">Logic, steps, or transitions modified</td><td class="py-2">A workflow transition was updated</td></tr>
            <tr class="border-b border-surface-100"><td class="py-2 font-mono">policy_changed</td><td class="py-2">Governance or constitution modified</td><td class="py-2">Security policy changed to require MFA</td></tr>
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Impact Propagation</h2>
      <p class="mt-2 text-surface-600">
        When a node changes, Prodara follows graph edges outward through 40+ edge types to identify all
        downstream nodes that may be affected. Each impacted node includes:
      </p>
      <ul class="mt-2 space-y-1 text-surface-600">
        <li><strong>reason</strong> - Why this node was impacted (e.g., "reads changed entity")</li>
        <li><strong>via</strong> - The edge kind that carried the impact (e.g., <code>reads</code>, <code>field_type</code>)</li>
        <li><strong>depth</strong> - How many edges away the change propagated (1 = direct, 2+ = transitive)</li>
      </ul>
      <app-code-block [code]="impactExample" language="json" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Task Actions</h2>
      <p class="mt-2 text-surface-600">
        The planner converts changes and impacts into actionable tasks:
      </p>
      <ul class="mt-4 space-y-2 text-surface-600">
        <li><code>generate</code> - Create new artifacts for an added node</li>
        <li><code>regenerate</code> - Update artifacts for a changed or impacted node</li>
        <li><code>remove</code> - Delete artifacts for a removed node</li>
        <li><code>verify</code> - Check artifacts for an impacted (but unchanged) node to confirm they still work</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Incremental Spec</h2>
      <p class="mt-2 text-surface-600">
        The plan is enriched into an <strong>Incremental Spec</strong> that adds node metadata and
        organizes tasks into six category slices for targeted generation:
      </p>
      <ul class="mt-2 space-y-1 text-surface-600">
        <li><code>backend</code> - Server-side models, workflows, and databases</li>
        <li><code>frontend</code> - Client-side models, surfaces, and rendering</li>
        <li><code>api</code> - Data contracts, serialization, and integrations</li>
        <li><code>runtime</code> - Secrets, environments, and deployments</li>
        <li><code>schema</code> - Data schemas, storage definitions, and types</li>
        <li><code>test</code> - Spec tests and validation rules</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Generating a Plan</h2>
      <app-code-block [code]="planCommands" language="bash" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Build State</h2>
      <p class="mt-2 text-surface-600">
        Plans are stored in the <code>.prodara/</code> directory alongside build state. The compiler
        automatically manages these files to enable incremental builds:
      </p>
      <app-code-block [code]="buildState" language="text" />
    </article>
  `,
})
export class PlanFormatComponent {
  readonly planExample = `{
  "format": "prodara-plan",
  "version": "0.1.0",
  "changes": [
    {
      "nodeId": "board.entity.task",
      "changeKind": "structurally_changed"
    },
    {
      "nodeId": "board.workflow.assign_task",
      "changeKind": "added"
    }
  ],
  "impacts": [
    {
      "nodeId": "board.surface.board_view",
      "reason": "binds changed entity",
      "via": "binds",
      "depth": 1
    }
  ],
  "tasks": [
    {
      "taskId": "task-001",
      "action": "regenerate",
      "nodeId": "board.entity.task",
      "reason": "structurally_changed"
    },
    {
      "taskId": "task-002",
      "action": "generate",
      "nodeId": "board.workflow.assign_task",
      "reason": "added"
    },
    {
      "taskId": "task-003",
      "action": "verify",
      "nodeId": "board.surface.board_view",
      "reason": "impacted via binds (depth 1)"
    }
  ]
}`;

  readonly impactExample = `{
  "nodeId": "board.surface.board_view",
  "reason": "binds changed entity board.entity.task",
  "via": "binds",
  "depth": 1
}`;

  readonly planCommands = `# Generate a plan by diffing against the last build
prodara plan --format json ./project

# Full build includes planning automatically
prodara build ./project

# Check what changed without rebuilding
prodara diff ./project`;

  readonly buildState = `.prodara/
├── build.json    # Build metadata, timestamps, and source hashes
├── graph.json    # Previous Product Graph snapshot
└── plan.json     # Latest incremental plan`;
}
