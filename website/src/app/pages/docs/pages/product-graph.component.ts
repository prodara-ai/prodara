import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-product-graph',
  imports: [CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Product Graph</h1>
      <p class="mt-4 text-lg text-surface-600">
        The Product Graph is the compiler's canonical output - a deterministic JSON structure
        containing all product nodes, module nodes, typed edges (40+ kinds), and build metadata.
        It serves as the single source of truth that AI agents, generators, and planners consume.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Format Envelope</h2>
      <app-code-block [code]="envelope" language="json" filename="graph.json" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Full Example</h2>
      <p class="mt-2 text-surface-600">
        Here's a simplified Product Graph for a task board application:
      </p>
      <app-code-block [code]="fullExample" language="json" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Node IDs</h2>
      <p class="mt-2 text-surface-600">
        All nodes use stable semantic IDs following the pattern <code>&lt;module&gt;.&lt;kind&gt;.&lt;name&gt;</code>.
        These IDs are deterministic and serve as cross-compilation references:
      </p>
      <ul class="mt-2 space-y-1 text-surface-600">
        <li><code>board.entity.task</code> - An entity named "task" in the "board" module</li>
        <li><code>board.workflow.create_task</code> - A workflow in the "board" module</li>
        <li><code>board.surface.board_view</code> - A surface in the "board" module</li>
        <li><code>billing.enum.invoice_status</code> - An enum in the "billing" module</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Edge Categories</h2>
      <p class="mt-2 text-surface-600">
        Edges represent relationships between nodes. With 40+ edge kinds organized into
        8 categories, the graph captures the full semantic structure of your product:
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        @for (cat of edgeCategories; track cat.name) {
          <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
            <h3 class="font-semibold text-surface-950">{{ cat.name }}</h3>
            <p class="mt-1 text-sm text-surface-600">{{ cat.desc }}</p>
            <p class="mt-2 text-xs font-mono text-surface-500">{{ cat.examples }}</p>
          </div>
        }
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Type References</h2>
      <p class="mt-2 text-surface-600">
        Field types are encoded in the graph as structured references:
      </p>
      <ul class="mt-2 space-y-1 text-surface-600">
        <li><strong>Primitives</strong> - <code>"string"</code>, <code>"integer"</code>, <code>"boolean"</code>, <code>"datetime"</code>, <code>"uuid"</code>, etc.</li>
        <li><strong>References</strong> - <code>{{ '{' }} "ref": "core.entity.user" {{ '}' }}</code></li>
        <li><strong>Generics</strong> - <code>{{ '{' }} "generic": "list", "arg": "string" {{ '}' }}</code> or <code>{{ '{' }} "generic": "optional", "arg": {{ '{' }} "ref": "..." {{ '}' }} {{ '}' }}</code></li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Determinism</h2>
      <p class="mt-2 text-surface-600">
        The same input spec always produces the exact same Product Graph, with the sole exception
        of the <code>compiled_at</code> timestamp in metadata. Source files are identified by
        SHA-256 hash, making it safe to use graph equality for caching, diffing, and
        drift detection.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Generating the Graph</h2>
      <app-code-block [code]="generateCommands" language="bash" />
    </article>
  `,
})
export class ProductGraphComponent {
  readonly envelope = `{
  "format": "prodara-product-graph",
  "version": "0.1.0",
  "product": { "name": "task_board", "title": "TaskBoard", "version": "1.0" },
  "modules": [ ... ],
  "edges": [ ... ],
  "metadata": {
    "compiled_at": "2026-03-19T12:00:00Z",
    "compiler_version": "0.1.0",
    "source_files": [
      { "path": "app.prd", "hash": "sha256:a1b2c3..." }
    ]
  }
}`;

  readonly fullExample = `{
  "modules": [
    {
      "id": "board",
      "declarations": [
        {
          "id": "board.entity.task",
          "kind": "entity",
          "name": "task",
          "fields": [
            { "name": "task_id", "type": "uuid" },
            { "name": "title", "type": "string" },
            { "name": "status", "type": { "ref": "board.enum.task_status" }, "default": "todo" }
          ]
        },
        {
          "id": "board.enum.task_status",
          "kind": "enum",
          "name": "task_status",
          "members": ["todo", "in_progress", "done"]
        }
      ]
    }
  ],
  "edges": [
    { "from": "board", "to": "board.entity.task", "kind": "contains" },
    { "from": "board.entity.task", "to": "board.enum.task_status", "kind": "field_type" },
    { "from": "board.workflow.create_task", "to": "board.entity.task", "kind": "writes" }
  ]
}`;

  readonly generateCommands = `# Emit the Product Graph as JSON
prodara graph --format json ./project

# Save to a specific file
prodara graph --output build/graph.json ./project

# Access programmatically
import { buildGraph, serializeGraph } from '@prodara/compiler';`;

  readonly edgeCategories = [
    { name: 'Structure', desc: 'Module membership, entity nesting, field ownership.', examples: 'contains, imports' },
    { name: 'Type', desc: 'Field type references, generic parameters, enum values.', examples: 'field_type, input_type, return_type, payload_type' },
    { name: 'Data Flow', desc: 'Workflow reads/writes, input/output contracts.', examples: 'reads, writes, uses_rule, calls' },
    { name: 'Events', desc: 'Event emission, subscription, scheduling.', examples: 'emits, triggers_on, notifies, transitions' },
    { name: 'Invocation', desc: 'Step calls, workflow triggers, hook bindings.', examples: 'invokes, binds, exposes_action' },
    { name: 'Surface', desc: 'Screen bindings, action links, component composition.', examples: 'contains_surface, targets_surface, uses_serialization' },
    { name: 'Governance', desc: 'Constitution policies, security rules, authorization.', examples: 'governs, authorized_as, binds_secret, uses_secret' },
    { name: 'Testing', desc: 'Test targets, assertion references, preconditions.', examples: 'tests, attaches_to, product_dependency' },
  ];
}
