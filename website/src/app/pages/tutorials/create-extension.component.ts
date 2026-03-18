import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../components/code-block.component';
import { CalloutComponent } from '../../components/callout.component';

@Component({
  selector: 'app-create-extension-tutorial',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
        Advanced &middot; ~20 minutes
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Create an Extension</h1>
      <p class="mt-4 text-lg text-surface-600">
        Build a Prodara extension that adds a custom reviewer and generator.
        Package it as an npm module that other teams can install and use.
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
      <section class="mt-14" id="scaffold">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">1</span>
          Scaffold the Package
        </h2>
        <p class="mt-4 text-surface-600">
          Create a new npm package with the Prodara extension manifest:
        </p>
        <app-code-block [code]="scaffoldCommands" language="bash" />
        <app-code-block [code]="packageJson" language="json" filename="package.json" />
      </section>

      <!-- Step 2 -->
      <section class="mt-14" id="manifest">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">2</span>
          Define Capabilities
        </h2>
        <p class="mt-4 text-surface-600">
          The <code>prodara-extension</code> key in <code>package.json</code> tells the compiler
          what your extension provides. Each capability has a <code>kind</code> and optional metadata.
        </p>
        <app-callout variant="info">
          Five capability kinds are supported: <code>reviewer</code>, <code>generator</code>,
          <code>validator</code>, <code>phase</code>, and <code>template</code>.
        </app-callout>
      </section>

      <!-- Step 3 -->
      <section class="mt-14" id="implement">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">3</span>
          Implement the Extension
        </h2>
        <p class="mt-4 text-surface-600">
          Create the main entry point that exports your capabilities. Here's an example
          reviewer that checks for REST API best practices:
        </p>
        <app-code-block [code]="extensionCode" language="typescript" filename="src/index.ts" />
      </section>

      <!-- Step 4 -->
      <section class="mt-14" id="install">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">4</span>
          Install &amp; Test
        </h2>
        <p class="mt-4 text-surface-600">
          Install your extension locally and verify it works:
        </p>
        <app-code-block [code]="installCommands" language="bash" />
        <app-callout variant="tip">
          Use <code>prodara extensions list</code> to verify your extension was
          loaded and its capabilities are registered.
        </app-callout>
      </section>

      <!-- Step 5 -->
      <section class="mt-14" id="publish">
        <h2 class="flex items-center gap-3 text-2xl font-bold text-surface-950">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-md shadow-primary-500/20">5</span>
          Publish to npm
        </h2>
        <p class="mt-4 text-surface-600">
          Publish your extension to npm so other teams can install it:
        </p>
        <app-code-block [code]="publishCommands" language="bash" />
        <p class="mt-4 text-surface-600">
          Other users install your extension with:
        </p>
        <app-code-block code="prodara extensions install @my-org/prodara-ext-rest-api" language="bash" />
      </section>

      <div class="mt-14 rounded-2xl border border-primary-200 bg-primary-50/50 p-6 dark:border-primary-800 dark:bg-primary-900/10">
        <h2 class="text-lg font-semibold text-surface-950">Next Steps</h2>
        <ul class="mt-3 space-y-2 text-sm text-surface-600">
          <li>Read the full <a routerLink="/docs/extensions" class="text-primary-600 hover:underline">Extensions &amp; Presets</a> reference</li>
          <li>Search the <a routerLink="/docs/extensions" class="text-primary-600 hover:underline">marketplace</a> for community extensions</li>
          <li>Create a <a routerLink="/docs/customization" class="text-primary-600 hover:underline">custom reviewer</a> without building a full extension</li>
        </ul>
      </div>
    </div>
  `,
})
export class CreateExtensionTutorialComponent {
  readonly steps = [
    { num: '1', anchor: 'scaffold', label: 'Scaffold the Package' },
    { num: '2', anchor: 'manifest', label: 'Define Capabilities' },
    { num: '3', anchor: 'implement', label: 'Implement the Extension' },
    { num: '4', anchor: 'install', label: 'Install & Test' },
    { num: '5', anchor: 'publish', label: 'Publish to npm' },
  ];

  readonly scaffoldCommands = `mkdir prodara-ext-rest-api && cd prodara-ext-rest-api
npm init -y`;

  readonly packageJson = `{
  "name": "@my-org/prodara-ext-rest-api",
  "version": "1.0.0",
  "main": "dist/index.js",
  "prodara-extension": {
    "capabilities": [
      { "kind": "reviewer", "id": "rest-api-best-practices" },
      { "kind": "validator", "id": "rest-naming-conventions" }
    ]
  }
}`;

  readonly extensionCode = `// src/index.ts
export const reviewer = {
  id: 'rest-api-best-practices',
  name: 'REST API Best Practices',
  perspective: \`You are a REST API design expert. Review all
workflows and surfaces for proper HTTP method usage,
resource naming conventions, and pagination patterns.
Flag any endpoint that uses verbs in URLs or returns
unbounded lists.\`,
  enabled: true,
};

export const validator = {
  id: 'rest-naming-conventions',
  validate(graph) {
    const findings = [];
    for (const node of graph.nodes) {
      if (node.kind === 'workflow' && /[A-Z]/.test(node.name)) {
        findings.push({
          code: 'REST001',
          severity: 'warning',
          message: \`Workflow "\${node.name}" uses camelCase — prefer snake_case for REST endpoints.\`,
          nodeId: node.id,
        });
      }
    }
    return findings;
  },
};`;

  readonly installCommands = `# Build the extension
npm run build

# Install locally in your Prodara project
cd ../my-project
prodara extensions install ../prodara-ext-rest-api

# Verify it's loaded
prodara extensions list

# Run a build with the new reviewer
prodara build --format json .`;

  readonly publishCommands = `# Build and publish
npm run build
npm publish --access public`;
}
