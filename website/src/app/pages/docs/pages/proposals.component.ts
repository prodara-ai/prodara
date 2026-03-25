import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-proposals',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Proposals &amp; Changes</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        The change proposal system lets you stage specification changes in isolation,
        get full compilation and review feedback, and then apply or archive them.
        Proposals live in <code>.prodara/changes/</code> and follow a structured lifecycle.
      </p>

      <!-- Creating a Proposal -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Creating a Proposal</h2>
      <p class="mt-2 text-surface-600">
        Use the <code>/prodara</code> prompt or the CLI to create a new proposal.
        Each proposal gets a timestamped directory with a <code>delta.prd</code> file for
        your specification changes and a <code>metadata.json</code> with status tracking.
      </p>
      <app-code-block [code]="createExample" language="bash" />

      <!-- Directory Layout -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Directory Layout</h2>
      <app-code-block [code]="directoryLayout" language="text" filename="project structure" />

      <!-- Lifecycle -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Proposal Lifecycle</h2>
      <div class="mt-6 space-y-3 not-prose">
        @for (step of lifecycle; track step.status) {
          <div class="flex gap-4 rounded-lg border border-surface-200 bg-surface-50 p-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              [class]="step.color">{{ step.num }}</span>
            <div>
              <p class="font-medium text-surface-950">
                {{ step.status }}
              </p>
              <p class="mt-1 text-sm text-surface-500">{{ step.desc }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Metadata -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Metadata</h2>
      <p class="mt-2 text-surface-600">
        Each proposal stores metadata alongside the delta spec:
      </p>
      <app-code-block [code]="metadataExample" language="json" filename="metadata.json" />

      <!-- Programmatic API -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Programmatic API</h2>
      <p class="mt-2 text-surface-600">
        The proposal system is fully accessible via the compiler API:
      </p>
      <app-code-block [code]="apiExample" language="typescript" />

      <app-callout variant="info">
        Applied proposals are moved to <code>.prodara/changes/archive/</code> so you can
        review them later. Use <code>archiveProposal()</code> to manually archive a proposal
        without applying it.
      </app-callout>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        See
        <a routerLink="/docs/customization" class="text-primary-600 hover:underline">Reviewers &amp; Constitution</a>
        to learn how proposals are reviewed, or
        <a routerLink="/docs/workflows" class="text-primary-600 hover:underline">Custom Workflows</a>
        to integrate proposals into automated pipelines.
      </p>
    </article>
  `,
})
export class ProposalsComponent {
  readonly lifecycle = [
    { num: '1', status: 'draft', desc: 'Created with prodara propose. The delta.prd file is ready for editing.', color: 'bg-surface-100 text-surface-700' },
    { num: '2', status: 'open', desc: 'Submitted for review. The compiler validates the delta against the current graph.', color: 'bg-primary-100 text-primary-700' },
    { num: '3', status: 'approved', desc: 'All reviewers have approved. Ready to apply.', color: 'bg-green-100 text-green-700' },
    { num: '4', status: 'applied', desc: 'The delta has been merged into the main specification.', color: 'bg-green-100 text-green-700' },
    { num: '5', status: 'rejected', desc: 'The proposal was rejected and moved to the archive.', color: 'bg-red-100 text-red-700' },
    { num: '6', status: 'archived', desc: 'Manually archived without applying. Preserved for reference.', color: 'bg-surface-100 text-surface-700' },
  ];

  readonly createExample = `# Via AI prompt (in your AI agent)
/Prodara Create a proposal to add payment processing to billing module

# Via CLI
prodara propose "Add payment processing to billing module"`;

  readonly directoryLayout = `.prodara/
  changes/
    2024-01-15T10-30-00-add-payments/
      delta.prd          # Specification changes
      metadata.json      # Status, author, timestamps
      design.md          # Optional design document
    archive/
      2024-01-10T09-00-00-add-users/
        delta.prd
        metadata.json`;

  readonly metadataExample = `{
  "id": "2024-01-15T10-30-00-add-payments",
  "description": "Add payment processing to billing module",
  "status": "open",
  "author": "agent",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:45:00Z"
}`;

  readonly apiExample = `import {
  createProposal,
  listProposals,
  getProposal,
  applyProposal,
  archiveProposal,
} from '@prodara/compiler';

// Create a new proposal
const proposal = await createProposal(rootDir, 'Add payments');

// List all proposals
const all = await listProposals(rootDir);

// Apply an approved proposal
await applyProposal(rootDir, proposal.id);

// Archive without applying
await archiveProposal(rootDir, proposal.id);`;
}
