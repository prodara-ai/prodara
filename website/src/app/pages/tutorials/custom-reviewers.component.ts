import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';
import { CalloutComponent } from '../../components/callout.component';

@Component({
  selector: 'app-custom-reviewers-tutorial',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        Intermediate &middot; ~15 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Custom Reviewers &amp; Constitution</h1>
      <p class="mt-4 text-lg text-surface-600">
        Learn how to configure built-in reviewers, create your own custom reviewers, and add
        constitution policies to govern AI-generated code. By the end you'll have a HIPAA
        compliance reviewer and a project constitution.
      </p>

      <!-- Steps -->
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
      <section class="mt-14" id="configure">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">1</span>
          Configure Built-in Reviewers
        </h2>
        <p class="mt-4 text-surface-600">
          Prodara ships with 9 built-in reviewers. By default, 7 are enabled and 2 (adversarial, edge-case)
          are disabled. Configure them in <code>prodara.config.json</code>:
        </p>
        <app-code-block [code]="configReviewers" language="json" filename="prodara.config.json" />
        <app-callout variant="info">
          Run <code>prodara review</code> to execute all enabled reviewers against your spec.
        </app-callout>
      </section>

      <!-- Step 2 -->
      <section class="mt-14" id="custom">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">2</span>
          Create a Custom Reviewer
        </h2>
        <p class="mt-4 text-surface-600">
          Create a YAML file in <code>.prodara/reviewers/</code> to define a custom reviewer.
          The reviewer will be automatically discovered and included in the review pipeline.
        </p>
        <app-code-block [code]="customReviewer" language="yaml" filename=".prodara/reviewers/hipaa.yml" />
        <p class="mt-4 text-surface-600">
          Or define custom reviewers inline in your config:
        </p>
        <app-code-block [code]="inlineReviewer" language="json" filename="prodara.config.json" />
      </section>

      <!-- Step 3 -->
      <section class="mt-14" id="constitution">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">3</span>
          Add a Constitution
        </h2>
        <p class="mt-4 text-surface-600">
          The constitution defines governance policies that AI agents must follow when generating code.
          Add one to your config:
        </p>
        <app-code-block [code]="constitution" language="json" filename="prodara.config.json" />
        <app-callout variant="tip">
          The constitution is injected into the <code>/prodara</code> prompt automatically.
          Your AI agent reads it before generating any implementation.
        </app-callout>
      </section>

      <!-- Step 4 -->
      <section class="mt-14" id="run">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">4</span>
          Run the Review Pipeline
        </h2>
        <p class="mt-4 text-surface-600">
          Build and review your project. The custom HIPAA reviewer now runs alongside the built-in
          reviewers:
        </p>
        <app-code-block [code]="runReview" language="bash" />
        <p class="mt-4 text-surface-600">
          The review output includes findings from all active reviewers, including your custom one.
          The fix loop automatically attempts to resolve any issues found.
        </p>
      </section>

      <!-- Next steps -->
      <div class="mt-14 rounded-2xl border border-primary-200 bg-primary-50/50 p-6 dark:border-primary-800 dark:bg-primary-900/10">
        <h2 class="text-lg font-semibold text-surface-950">Next Steps</h2>
        <ul class="mt-3 space-y-2 text-sm text-surface-600">
          <li>Read the full <a routerLink="/docs/customization" class="text-primary-600 hover:underline">Reviewers &amp; Constitution</a> reference</li>
          <li>Create an <a routerLink="/tutorials/create-extension" class="text-primary-600 hover:underline">extension</a> to package your reviewer for other projects</li>
          <li>Use <a routerLink="/docs/interactive-modes" class="text-primary-600 hover:underline">Party mode</a> to see all reviewers discuss a topic</li>
        </ul>
      </div>
    </div>
  `,
})
export class CustomReviewersTutorialComponent {
  readonly steps = [
    { num: '1', anchor: 'configure', label: 'Configure Built-in Reviewers' },
    { num: '2', anchor: 'custom', label: 'Create a Custom Reviewer' },
    { num: '3', anchor: 'constitution', label: 'Add a Constitution' },
    { num: '4', anchor: 'run', label: 'Run the Review Pipeline' },
  ];

  readonly configReviewers = `{
  "reviewers": {
    "architecture": { "enabled": true },
    "quality": { "enabled": true },
    "codeQuality": { "enabled": true },
    "specification": { "enabled": true },
    "ux": { "enabled": true },
    "security": { "enabled": true },
    "testQuality": { "enabled": true },
    "adversarial": { "enabled": true },
    "edgeCase": { "enabled": false }
  }
}`;

  readonly customReviewer = `id: hipaa
name: HIPAA Compliance
perspective: >
  You are a HIPAA compliance expert. Review all entities for
  proper PHI handling. Check that health data fields have
  encryption at rest and access logging. Flag any entity that
  stores patient data without proper authorization rules.
enabled: true`;

  readonly inlineReviewer = `{
  "reviewers": {
    "custom": {
      "id": "hipaa",
      "name": "HIPAA Compliance",
      "perspective": "You are a HIPAA compliance expert...",
      "enabled": true
    }
  }
}`;

  readonly constitution = `{
  "constitution": {
    "policies": [
      "All PII fields must be encrypted at rest",
      "Every entity with user data must have an audit trail",
      "No direct database access — all mutations go through workflows",
      "All API endpoints require authentication"
    ]
  }
}`;

  readonly runReview = `# Build and review
prodara build --format json ./project

# Or just run the review step
prodara review --format json ./project`;
}
