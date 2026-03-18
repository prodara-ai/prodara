import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';
import { CalloutComponent } from '../../components/callout.component';

@Component({
  selector: 'app-proposal-management-tutorial',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        Intermediate &middot; ~10 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Proposal Management</h1>
      <p class="mt-4 text-lg text-surface-600">
        Learn how to use Prodara's propose/apply/archive workflow to manage spec changes safely.
        Proposals let you draft, test, and review changes in isolation before merging them into your main specification.
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
      <section class="mt-14" id="create">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">1</span>
          Create a Proposal
        </h2>
        <p class="mt-4 text-surface-600">
          A proposal is an isolated workspace for drafting spec changes. When you create one, Prodara
          sets up a folder in <code>.prodara/changes/</code> with its own <code>delta.prd</code> file.
        </p>
        <app-code-block [code]="createProposal" language="bash" />
        <p class="mt-4 text-surface-600">
          This creates a new directory structure:
        </p>
        <app-code-block [code]="folderStructure" language="text" />
        <app-callout type="tip">
          Give proposals descriptive names — they become folder names and appear in your build history.
        </app-callout>
      </section>

      <!-- Step 2 -->
      <section class="mt-14" id="author">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">2</span>
          Author the Delta Spec
        </h2>
        <p class="mt-4 text-surface-600">
          Open the <code>delta.prd</code> file and write your proposed changes. The delta spec uses
          the same Prodara language as your main spec, but only needs to contain the additions or modifications.
        </p>
        <app-code-block [code]="deltaExample" language="prodara" />
        <p class="mt-4 text-surface-600">
          The compiler will merge your delta with the existing spec during validation,
          so you see the full impact of your changes before committing them.
        </p>
      </section>

      <!-- Step 3 -->
      <section class="mt-14" id="validate">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">3</span>
          Validate the Proposal
        </h2>
        <p class="mt-4 text-surface-600">
          Before applying a proposal, run a build to ensure the merged spec compiles cleanly.
          Prodara will type-check, validate the graph, and run reviewers against the combined spec.
        </p>
        <app-code-block [code]="validateProposal" language="bash" />
        <p class="mt-4 text-surface-600">
          If there are errors, fix them in the <code>delta.prd</code> file. The proposal
          stays isolated until you explicitly apply it.
        </p>
      </section>

      <!-- Step 4 -->
      <section class="mt-14" id="apply">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">4</span>
          Apply or Archive
        </h2>
        <p class="mt-4 text-surface-600">
          Once your proposal validates, apply it to merge the delta into your main spec.
          Prodara will re-validate before merging to prevent regressions.
        </p>
        <app-code-block [code]="applyProposal" language="bash" />
        <p class="mt-4 text-surface-600">
          If the proposal is no longer needed, archive it instead:
        </p>
        <app-code-block [code]="archiveProposal" language="bash" />
        <app-callout type="info">
          Archived proposals are moved out of the active changes directory but preserved for audit purposes.
        </app-callout>
      </section>

      <!-- Step 5 -->
      <section class="mt-14" id="team">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">5</span>
          Team Collaboration
        </h2>
        <p class="mt-4 text-surface-600">
          Proposals pair naturally with version control. Each proposal lives in its own directory,
          so team members can work on different proposals in parallel on separate branches.
        </p>
        <ul class="mt-4 space-y-2 text-surface-600">
          <li>Create a Git branch and a Prodara proposal together for clean tracking.</li>
          <li>Use <code>prodara build</code> in CI to validate proposals before merge.</li>
          <li>Reviewers can check the <code>delta.prd</code> diff just like they review code changes.</li>
          <li>Use <code>prodara drift</code> to ensure the spec stays in sync after apply.</li>
        </ul>
      </section>

      <!-- Next steps -->
      <section class="mt-14 rounded-2xl border border-surface-200 bg-surface-50 p-6">
        <h2 class="text-lg font-semibold text-surface-950">Next Steps</h2>
        <ul class="mt-3 space-y-2 text-sm text-surface-600">
          <li>
            <a routerLink="/tutorials/interactive-workflows" class="text-primary-600 hover:underline">Interactive Workflows</a>
            — combine proposals with custom review workflows.
          </li>
          <li>
            <a routerLink="/docs/cli-usage" class="text-primary-600 hover:underline">CLI Usage</a>
            — full reference for propose, apply, archive, and all other commands.
          </li>
          <li>
            <a routerLink="/docs/plan-format" class="text-primary-600 hover:underline">Plan Format</a>
            — understand the incremental plan output that proposals generate.
          </li>
        </ul>
      </section>
    </div>
  `,
})
export class ProposalManagementTutorialComponent {
  readonly steps = [
    { num: 1, anchor: 'create', label: 'Create a Proposal' },
    { num: 2, anchor: 'author', label: 'Author the Delta Spec' },
    { num: 3, anchor: 'validate', label: 'Validate the Proposal' },
    { num: 4, anchor: 'apply', label: 'Apply or Archive' },
    { num: 5, anchor: 'team', label: 'Team Collaboration' },
  ];

  readonly createProposal = `prodara propose "Add payment processing"`;

  readonly folderStructure = `.prodara/
  changes/
    add-payment-processing/
      delta.prd
      metadata.json`;

  readonly deltaExample = `module payments {
  entity Invoice {
    amount: currency
    status: draft | sent | paid | overdue

    workflow lifecycle {
      draft -> sent: send
      sent -> paid: mark_paid
      sent -> overdue: mark_overdue
    }
  }

  action process_payment {
    input: Invoice
    trigger: mark_paid
  }
}`;

  readonly validateProposal = `# Validate the proposal merges cleanly with the main spec
prodara build ./my-project`;

  readonly applyProposal = `# Apply the proposal — merges delta.prd into main spec
prodara apply add-payment-processing`;

  readonly archiveProposal = `# Archive a rejected or completed proposal
prodara archive add-payment-processing`;
}
