import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-customization',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Reviewers &amp; Constitution</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara includes 7 built-in reviewers, supports custom reviewers loaded from Markdown files,
        and provides a project-level constitution that governs all AI interactions. You can also
        override any template and define per-artifact rules.
      </p>

      <!-- Built-in Reviewers -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Built-in Reviewers</h2>
      <p class="mt-2 text-surface-600">
        Each reviewer analyzes your specification from a specific perspective. Five are enabled by default;
        two specialized reviewers are opt-in.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Reviewer</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Perspective</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Default</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (r of reviewers; track r.name) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ r.name }}</td>
                <td class="py-2">{{ r.perspective }}</td>
                <td class="py-2">
                  <span [class]="r.enabled ? 'text-green-600' : 'text-surface-400'">{{ r.enabled ? '✓ Enabled' : '○ Disabled' }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-callout variant="tip">
        Enable the <strong>adversarial</strong> and <strong>edge-case</strong> reviewers for thorough
        pre-deployment audits. They find edge cases and attack vectors that other reviewers miss.
      </app-callout>

      <h3 class="mt-8 text-xl font-bold text-surface-950">Configuring Reviewers</h3>
      <p class="mt-2 text-surface-600">
        Enable, disable, or customize any reviewer in your <code>prodara.config.json</code>:
      </p>
      <app-code-block [code]="reviewerConfig" language="json" filename="prodara.config.json" />

      <!-- Custom Reviewers -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Custom Reviewers</h2>
      <p class="mt-2 text-surface-600">
        Create project-specific reviewers by adding Markdown files to the
        <code>.prodara/reviewers/</code> directory. Each file defines a reviewer's system prompt,
        perspective, and focus areas.
      </p>
      <app-code-block [code]="customReviewer" language="text" filename=".prodara/reviewers/accessibility.md" />
      <p class="mt-4 text-surface-600">
        Custom reviewers appear alongside built-in reviewers during the review phase.
        Reference them in config by filename (without the <code>.md</code> extension):
      </p>
      <app-code-block [code]="customReviewerConfig" language="json" filename="prodara.config.json" />

      <!-- Constitution -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Constitution</h2>
      <p class="mt-2 text-surface-600">
        The constitution is a project-level Markdown document that's injected into every AI prompt —
        phase templates, reviewer prompts, and agent instructions. It defines invariants, coding
        standards, and architectural constraints that apply across the entire specification.
      </p>
      <app-code-block [code]="constitution" language="text" filename=".prodara/constitution.md" />
      <p class="mt-4 text-surface-600">
        Configure the constitution path in your config:
      </p>
      <app-code-block [code]="constitutionConfig" language="json" filename="prodara.config.json" />

      <!-- Template Overrides -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Template Overrides</h2>
      <p class="mt-2 text-surface-600">
        Prodara uses 18 built-in templates for phase prompts and reviewer prompts. You can override
        any template with a local Markdown file:
      </p>
      <app-code-block [code]="templateOverrides" language="json" filename="prodara.config.json" />
      <p class="mt-4 text-surface-600">
        Template IDs follow the pattern <code>phase:&lt;name&gt;</code> or <code>reviewer:&lt;name&gt;</code>.
        Available phase IDs: <code>specify</code>, <code>clarify</code>, <code>plan</code>,
        <code>implement</code>, <code>review</code>, <code>fix</code>, <code>explore</code>,
        <code>help</code>, <code>party</code>, <code>design</code>, <code>onboard</code>.
      </p>

      <!-- Per-Artifact Rules -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Per-Artifact Rules</h2>
      <p class="mt-2 text-surface-600">
        Define rules that are injected into specific artifact types during generation.
        This lets you enforce standards for proposals, design documents, tasks, and more:
      </p>
      <app-code-block [code]="artifactRules" language="json" filename="prodara.config.json" />

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        Learn about
        <a routerLink="/docs/slash-commands" class="text-primary-600 hover:underline">slash commands</a>
        that trigger reviewers, or explore
        <a routerLink="/docs/extensions" class="text-primary-600 hover:underline">extensions</a>
        to add custom reviewer capabilities.
      </p>
    </article>
  `,
})
export class CustomizationComponent {
  readonly reviewers = [
    { name: 'architecture', perspective: 'Module boundaries, coupling, empty modules, authorization coverage', enabled: true },
    { name: 'security', perspective: 'Authorization rules, secret bindings, policy enforcement', enabled: true },
    { name: 'code-quality', perspective: 'Entity coverage, orphan nodes, duplicate edges', enabled: true },
    { name: 'test-quality', perspective: 'Test block presence, assertion quality, coverage gaps', enabled: true },
    { name: 'ux-quality', perspective: 'Surface rendering, token definitions, form validation', enabled: true },
    { name: 'adversarial', perspective: 'Attack scenarios, gap analysis, unstated assumptions', enabled: false },
    { name: 'edge-case', perspective: 'Boundary conditions, empty sets, concurrency, error paths', enabled: false },
  ];

  readonly reviewerConfig = `{
  "reviewers": {
    "architecture": { "enabled": true },
    "security": { "enabled": true, "promptPath": ".prodara/reviewers/strict-security.md" },
    "adversarial": { "enabled": true },
    "edgeCase": { "enabled": true }
  }
}`;

  readonly customReviewer = `# Accessibility Reviewer

You are an accessibility specialist. Review the specification for:

## Focus Areas
- Every surface must define keyboard navigation
- Form fields require labels and ARIA attributes
- Color-only indicators must have text alternatives
- All images in surfaces need alt text descriptions

## Severity
- Missing keyboard navigation: error
- Missing ARIA labels: warning
- Missing alt text: warning`;

  readonly customReviewerConfig = `{
  "reviewers": {
    "accessibility": { "enabled": true, "promptPath": ".prodara/reviewers/accessibility.md" }
  }
}`;

  readonly constitution = `# Project Constitution

## Architecture
- All modules must be self-contained with clear boundaries
- Cross-module dependencies require explicit import declarations
- No circular module dependencies

## Coding Standards
- Entity names use PascalCase, field names use camelCase
- All monetary values use the \`money\` type
- All timestamps use the \`datetime\` type

## Security
- All write workflows require authorization
- Sensitive fields (email, phone) must be marked PII
- API surfaces require rate limiting policies`;

  readonly constitutionConfig = `{
  "constitution": {
    "path": ".prodara/constitution.md"
  }
}`;

  readonly templateOverrides = `{
  "templateOverrides": {
    "phase:implement": ".prodara/templates/implement.md",
    "reviewer:security": ".prodara/templates/strict-security-review.md"
  }
}`;

  readonly artifactRules = `{
  "artifactRules": {
    "proposal": [
      "Must include acceptance criteria",
      "Must list affected modules"
    ],
    "design": [
      "Must include architecture decisions",
      "Must include risk assessment"
    ],
    "task": [
      "Must reference the parent proposal"
    ]
  }
}`;
}
