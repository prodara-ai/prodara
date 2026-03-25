import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';
import { CalloutComponent } from '../../components/callout.component';

@Component({
  selector: 'app-deep-dive',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        Intermediate &middot; ~30 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Deep Dive: Task Board</h1>
      <p class="mt-4 text-lg text-surface-600">
        Build a complete Task Board application with multiple modules, entities, workflows,
        screens, tests, and governance policies.
      </p>

      <app-callout variant="info">
        This tutorial assumes you've completed the
        <a routerLink="/tutorials/quick-start" class="underline">Quick Start</a>.
        If not, start there first.
      </app-callout>

      <!-- Step 1: Project setup -->
      <section class="mt-12" id="setup">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">1</span>
          Project Setup
        </h2>
        <p class="mt-4 text-surface-600">Start with a fresh project:</p>
        <app-code-block code="prodara init task-board --template minimal\ncd task-board" language="bash" />
        <p class="mt-2 text-surface-600">
          We'll evolve this minimal project into a full multi-file Task Board with 4 specification files.
        </p>
      </section>

      <!-- Step 2: Product declaration -->
      <section class="mt-12" id="product">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">2</span>
          Product Declaration
        </h2>
        <p class="mt-4 text-surface-600">Replace <code>app.prd</code> with the product declaration:</p>
        <app-code-block [code]="productDecl" language="prd" filename="app.prd" />
        <p class="mt-2 text-surface-600">This declares a product with two modules: <code>board</code> for the core task management domain, and <code>platform</code> for cross-cutting concerns.</p>
      </section>

      <!-- Step 3: Domain model -->
      <section class="mt-12" id="domain">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">3</span>
          Domain Model
        </h2>
        <p class="mt-4 text-surface-600">Create <code>board.prd</code> with entities and enums:</p>
        <app-code-block [code]="domainModel" language="prd" filename="board.prd" />
      </section>

      <!-- Step 4: Workflows -->
      <section class="mt-12" id="workflows">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">4</span>
          Workflows
        </h2>
        <p class="mt-4 text-surface-600">Add workflows to <code>board.prd</code>:</p>
        <app-code-block [code]="workflows" language="prd" filename="board.prd (continued)" />
      </section>

      <!-- Step 5: Surfaces -->
      <section class="mt-12" id="surfaces">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">5</span>
          Surfaces
        </h2>
        <p class="mt-4 text-surface-600">Add screens to <code>board.prd</code>:</p>
        <app-code-block [code]="surfaces" language="prd" filename="board.prd (continued)" />
      </section>

      <!-- Step 6: Governance -->
      <section class="mt-12" id="governance">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">6</span>
          Governance
        </h2>
        <p class="mt-4 text-surface-600">Create <code>platform.prd</code> with a constitution:</p>
        <app-code-block [code]="governance" language="prd" filename="platform.prd" />
      </section>

      <!-- Step 7: Tests -->
      <section class="mt-12" id="tests">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">7</span>
          Specification Tests
        </h2>
        <p class="mt-4 text-surface-600">Add tests at the end of <code>board.prd</code>:</p>
        <app-code-block [code]="tests" language="prd" filename="board.prd (continued)" />
      </section>

      <!-- Step 8: Compile & test -->
      <section class="mt-12" id="compile">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">8</span>
          Compile & Test
        </h2>
        <p class="mt-4 text-surface-600">Run the full pipeline:</p>
        <app-code-block [code]="compileCmds" language="bash" />
      </section>

      <!-- Step 9: Semantic diffing -->
      <section class="mt-12" id="diffing">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">9</span>
          Semantic Diffing
        </h2>
        <p class="mt-4 text-surface-600">
          Now make a change - add a <code>priority</code> field to the task entity - and see
          the incremental plan:
        </p>
        <app-code-block [code]="diffing" language="bash" />
        <p class="mt-2 text-surface-600">
          The plan shows which nodes changed and which downstream artifacts are impacted,
          including the depth of impact propagation through the graph.
        </p>
      </section>

      <!-- Next steps -->
      <section class="mt-16 rounded-xl border border-primary-200 bg-primary-50 p-8 dark:border-primary-800 dark:bg-primary-900/10">
        <h2 class="text-xl font-bold text-surface-950">What's Next?</h2>
        <ul class="mt-4 space-y-2">
          <li>
            <a routerLink="/docs/language/governance" class="font-medium text-primary-600 hover:underline">Governance Reference</a>
            <span class="text-surface-600"> - Constitution policies, security, privacy</span>
          </li>
          <li>
            <a routerLink="/docs/agent-integration" class="font-medium text-primary-600 hover:underline">Agent Integration</a>
            <span class="text-surface-600"> - Feed the Product Graph to AI agents</span>
          </li>
          <li>
            <a routerLink="/docs/api-reference" class="font-medium text-primary-600 hover:underline">API Reference</a>
            <span class="text-surface-600"> - Use the compiler programmatically</span>
          </li>
        </ul>
      </section>
    </div>
  `,
})
export class DeepDiveComponent {
  readonly productDecl = `product task_board {
  title: "Task Board"
  version: "1.0.0"
  modules: [board, platform]
}`;

  readonly domainModel = `module board {
  actor member {
    title: "Team Member"
  }

  actor admin {
    title: "Board Admin"
  }

  entity task {
    task_id: uuid
    title: string
    description: optional<string>
    status: task_status = backlog
    assignee: optional<member>
    created_at: datetime
  }

  enum task_status {
    backlog
    todo
    in_progress
    review
    done
  }

  enum task_error {
    invalid_title
    unauthorized
    task_not_found
  }
}`;

  readonly workflows = `  capability task_management {
    title: "Task Management"
  }

  workflow create_task {
    capability: task_management
    authorization { member: [task.create] }
    writes { task }
    returns { ok: task; error: task_error }
  }

  workflow move_task {
    capability: task_management
    authorization { member: [task.update] }
    reads { task }
    writes { task }
    transitions {
      task.status: backlog -> todo
      task.status: todo -> in_progress
      task.status: in_progress -> review
      task.status: review -> done
    }
    returns { ok: task; error: task_error }
  }

  workflow delete_task {
    capability: task_management
    authorization { admin: [task.delete] }
    writes { task }
    returns { ok: task; error: task_error }
  }`;

  readonly surfaces = `  surface board_view {
    kind: dashboard
    title: "Task Board"
    binds: task
    actions: [do_create_task, do_move_task]
    hooks { load: load_tasks }
  }

  surface task_detail {
    kind: view
    title: "Task Detail"
    binds: task
    actions: [do_move_task, do_delete_task]
  }

  action do_create_task { workflow: create_task }
  action do_move_task { workflow: move_task }
  action do_delete_task { workflow: delete_task }`;

  readonly governance = `module platform {
  constitution board_policies {
    policies {
      security {
        authentication: required
        authorization: required
      }
      testing {
        tests_required: true
      }
      style {
        indentation: 2
        naming: camelCase
      }
    }
  }
}`;

  readonly tests = `  test create_task_auth {
    target: create_task
    expect {
      authorization {
        member: allowed
      }
    }
  }

  test move_task_transitions {
    target: move_task
    given { task.status: todo }
    expect {
      transition: "task.status: todo -> in_progress"
      returns: ok
    }
  }`;

  readonly compileCmds = `# Validate
prodara validate .

# Compile to Product Graph
prodara graph --output product-graph.json .

# Run tests
prodara test .

# Full build pipeline
prodara build .`;

  readonly diffing = `# First, compile to establish a baseline
prodara build .

# Now edit board.prd - add: priority: integer = 0
# Then generate the incremental plan
prodara plan --format json .`;
}
