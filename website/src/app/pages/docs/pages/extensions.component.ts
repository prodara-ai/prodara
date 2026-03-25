import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-extensions',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Extensions &amp; Presets</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Extend the Prodara compiler with custom capabilities and share configuration
        across projects with presets. Extensions are npm packages discovered from
        a local registry or the Prodara marketplace.
      </p>

      <!-- Extension Manifest -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Extension Manifest</h2>
      <p class="mt-2 text-surface-600">
        Every extension is an npm package with a <code>prodara-extension</code> key in
        <code>package.json</code> that describes its capabilities.
      </p>
      <app-code-block [code]="manifestExample" language="json" filename="package.json" />

      <!-- Capabilities -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Capability Kinds</h2>
      <p class="mt-2 text-surface-600">
        Extensions declare one or more capabilities that hook into different parts
        of the compiler pipeline.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Kind</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (cap of capabilities; track cap.kind) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ cap.kind }}</td>
                <td class="py-2">{{ cap.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Extension Registry -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Extension Registry</h2>
      <p class="mt-2 text-surface-600">
        The <code>ExtensionRegistry</code> manages loaded extensions at runtime. Use
        <code>loadExtensions()</code> to discover and activate all installed extensions:
      </p>
      <app-code-block [code]="registryExample" language="typescript" />

      <!-- Marketplace -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Marketplace</h2>
      <p class="mt-2 text-surface-600">
        The Prodara marketplace provides a curated list of community extensions.
        Search, install, and remove extensions using the CLI or the programmatic API.
      </p>
      <app-code-block [code]="marketplaceExample" language="typescript" />

      <app-callout variant="info">
        Use the <code>/prodara</code> prompt to manage extensions
        from within your AI agent. See
        <a routerLink="/docs/slash-commands" class="underline">AI Prompt File</a>.
      </app-callout>

      <!-- CLI commands -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">CLI Commands</h2>
      <app-code-block [code]="cliCommands" language="bash" />

      <!-- Presets -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Presets</h2>
      <p class="mt-2 text-surface-600">
        Presets are shareable configuration bundles that set compiler options,
        enable or disable reviewers, and configure governance rules. They're
        useful for enforcing organizational standards across multiple projects.
      </p>
      <app-code-block [code]="presetExample" language="json" filename="prodara.config.json" />
      <p class="mt-4 text-surface-600">
        Presets are resolved from the registry during the
        <strong>Registry Resolution</strong> compiler phase. Multiple presets
        can be composed — later presets override earlier ones.
      </p>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        Learn how to create your own extension in the
        <a routerLink="/tutorials/create-extension" class="text-primary-600 hover:underline">Create an Extension</a>
        tutorial, or read about
        <a routerLink="/docs/customization" class="text-primary-600 hover:underline">reviewer customization</a>.
      </p>
    </article>
  `,
})
export class ExtensionsComponent {
  readonly capabilities = [
    { kind: 'reviewer', desc: 'Adds a custom reviewer agent to the review pipeline.' },
    { kind: 'generator', desc: 'Adds a code generator that produces artifacts from the Product Graph.' },
    { kind: 'validator', desc: 'Adds custom validation rules executed during the graph validation phase.' },
    { kind: 'phase', desc: 'Adds a new compiler phase to the pipeline.' },
    { kind: 'template', desc: 'Provides custom prompt templates for agent integrations.' },
  ];

  readonly manifestExample = `{
  "name": "@my-org/prodara-ext-react-gen",
  "version": "1.0.0",
  "prodara-extension": {
    "capabilities": [
      { "kind": "generator", "target": "react" },
      { "kind": "reviewer", "id": "react-best-practices" }
    ]
  }
}`;

  readonly registryExample = `import {
  ExtensionRegistry,
  loadExtensions,
  installExtension,
  removeExtension,
  listInstalledExtensions,
} from '@prodara/compiler';

// Install from npm
await installExtension('@my-org/prodara-ext-react-gen');

// Load all installed extensions
const extensions = await loadExtensions();
const registry = new ExtensionRegistry();

for (const ext of extensions) {
  registry.register(ext);
}

// List installed
const installed = await listInstalledExtensions();`;

  readonly marketplaceExample = `import { searchMarketplace } from '@prodara/compiler';

// Search the marketplace
const results = await searchMarketplace('react generator');

// Install via npm
// npmInstall / npmRemove wrap child_process for safety`;

  readonly cliCommands = `# Install an extension
prodara extensions install @my-org/prodara-ext-react-gen

# List installed extensions
prodara extensions list

# Remove an extension
prodara extensions remove @my-org/prodara-ext-react-gen

# Search the marketplace
prodara extensions search "react generator"`;

  readonly presetExample = `{
  "extends": ["@prodara/preset-strict", "@my-org/preset-hipaa"],
  "reviewers": {
    "security": { "enabled": true },
    "adversarial": { "enabled": true }
  },
  "constitution": {
    "policies": ["All PII fields must be encrypted at rest"]
  }
}`;
}
