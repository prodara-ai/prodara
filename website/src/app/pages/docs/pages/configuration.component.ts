import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-configuration',
  imports: [RouterLink, CodeBlockComponent, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Configuration</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Configure the Prodara compiler via <code>prodara.config.json</code> at your project root.
        All settings have sensible defaults — you only need to override what you want to change.
      </p>

      <!-- Config file -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Configuration File</h2>
      <p class="mt-2 text-surface-600">
        The compiler looks for <code>prodara.config.json</code> in the project root.
        Create one with <code>prodara init</code> or write it manually:
      </p>
      <app-code-block [code]="fullConfig" language="json" filename="prodara.config.json" />

      <!-- Sections -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Configuration Sections</h2>

      @for (section of sections; track section.key) {
        <div class="mt-8">
          <h3 class="text-xl font-semibold text-surface-950">
            <code class="rounded bg-surface-100 px-2 py-0.5 text-primary-700">{{ section.key }}</code>
          </h3>
          <p class="mt-2 text-surface-600">{{ section.desc }}</p>
          <div class="mt-3 overflow-x-auto not-prose">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-surface-200">
                  <th class="pb-2 text-left font-semibold text-surface-950">Option</th>
                  <th class="pb-2 text-left font-semibold text-surface-950">Type</th>
                  <th class="pb-2 text-left font-semibold text-surface-950">Default</th>
                  <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
                </tr>
              </thead>
              <tbody class="text-surface-600">
                @for (opt of section.options; track opt.name) {
                  <tr class="border-b border-surface-100">
                    <td class="py-2 font-mono text-sm text-primary-700">{{ opt.name }}</td>
                    <td class="py-2 font-mono text-xs">{{ opt.type }}</td>
                    <td class="py-2 font-mono text-xs">{{ opt.default }}</td>
                    <td class="py-2">{{ opt.desc }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Resolution order -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Resolution Order</h2>
      <p class="mt-2 text-surface-600">
        Configuration is resolved in priority order. Later sources override earlier ones:
      </p>
      <ol class="mt-4 space-y-2 text-surface-600">
        <li><strong class="text-surface-900">Built-in defaults</strong> — Sensible values shipped with the compiler</li>
        <li><strong class="text-surface-900">Presets</strong> — Shared configuration bundles from <code>extends</code></li>
        <li><strong class="text-surface-900">prodara.config.json</strong> — Project-level overrides</li>
        <li><strong class="text-surface-900">CLI flags</strong> — Highest priority, override everything</li>
      </ol>

      <app-callout variant="info">
        Use <code>resolveConfig()</code> from the programmatic API to see the fully resolved
        configuration for a project, including all defaults and preset merges.
      </app-callout>

      <!-- Programmatic API -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Programmatic API</h2>
      <app-code-block [code]="apiExample" language="typescript" />

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        Learn about
        <a routerLink="/docs/extensions" class="text-primary-600 hover:underline">extensions and presets</a>
        for shareable configuration, or
        <a routerLink="/docs/customization" class="text-primary-600 hover:underline">reviewer customization</a>
        for fine-tuning the review pipeline.
      </p>
    </article>
  `,
})
export class ConfigurationComponent {
  readonly sections = [
    {
      key: 'phases',
      desc: 'Control which compilation phases run and their behavior.',
      options: [
        { name: 'enabled', type: 'boolean', default: 'true', desc: 'Enable or disable a specific phase.' },
        { name: 'parallel', type: 'boolean', default: 'false', desc: 'Run independent phases in parallel.' },
      ],
    },
    {
      key: 'clarify',
      desc: 'Configure the clarification phase for ambiguity detection.',
      options: [
        { name: 'maxQuestions', type: 'number', default: '10', desc: 'Maximum number of clarification questions.' },
        { name: 'priority', type: 'QuestionPriority', default: '"high"', desc: 'Minimum priority threshold for questions.' },
        { name: 'ambiguityThreshold', type: 'AmbiguityThreshold', default: '"medium"', desc: 'Sensitivity for ambiguity detection.' },
        { name: 'autoResolve', type: 'boolean', default: 'false', desc: 'Automatically resolve common clarifications.' },
      ],
    },
    {
      key: 'reviewers',
      desc: 'Configure the reviewer pipeline. See Reviewers & Constitution for details.',
      options: [
        { name: '<reviewer>.enabled', type: 'boolean', default: 'varies', desc: 'Enable or disable a specific reviewer.' },
        { name: '<reviewer>.custom', type: 'object', default: '—', desc: 'Custom reviewer definition with perspective and prompt.' },
      ],
    },
    {
      key: 'reviewFix',
      desc: 'Configure the automated fix loop after review.',
      options: [
        { name: 'maxAttempts', type: 'number', default: '3', desc: 'Maximum number of fix attempts per finding.' },
        { name: 'severity', type: 'FixSeverity', default: '"error"', desc: 'Minimum severity that triggers a fix attempt.' },
        { name: 'autoFix', type: 'boolean', default: 'true', desc: 'Whether to automatically attempt fixes.' },
      ],
    },
    {
      key: 'validation',
      desc: 'Control which validation rules run during graph validation.',
      options: [
        { name: 'strict', type: 'boolean', default: 'false', desc: 'Enable strict mode (warnings become errors).' },
        { name: 'rules', type: 'string[]', default: '[]', desc: 'Custom validation rules to enable.' },
      ],
    },
    {
      key: 'agent',
      desc: 'Configure agent-specific behavior for slash command generation.',
      options: [
        { name: 'platform', type: 'AgentPlatform', default: '"generic"', desc: 'Target AI agent platform.' },
        { name: 'provider', type: 'ApiProvider', default: '—', desc: 'AI provider for the agent.' },
      ],
    },
    {
      key: 'audit',
      desc: 'Configure the audit trail for build tracking.',
      options: [
        { name: 'enabled', type: 'boolean', default: 'true', desc: 'Enable audit logging of builds.' },
        { name: 'retentionDays', type: 'number', default: '30', desc: 'Days to retain audit entries.' },
      ],
    },
  ];

  readonly fullConfig = `{
  "extends": ["@prodara/preset-strict"],
  "phases": {
    "discovery": { "enabled": true },
    "specTests": { "enabled": true }
  },
  "clarify": {
    "maxQuestions": 10,
    "priority": "high",
    "ambiguityThreshold": "medium",
    "autoResolve": false
  },
  "reviewers": {
    "architecture": { "enabled": true },
    "quality": { "enabled": true },
    "security": { "enabled": true },
    "adversarial": { "enabled": false },
    "edgeCase": { "enabled": false }
  },
  "reviewFix": {
    "maxAttempts": 3,
    "severity": "error",
    "autoFix": true
  },
  "validation": {
    "strict": false
  },
  "agent": {
    "platform": "copilot"
  },
  "audit": {
    "enabled": true,
    "retentionDays": 30
  }
}`;

  readonly apiExample = `import {
  loadConfig,
  resolveConfig,
  DEFAULT_CONFIG,
  CONFIG_FILENAME,
} from '@prodara/compiler';

// Load from file
const loaded = await loadConfig('./project');

// Resolve with defaults and presets
const resolved = resolveConfig(loaded.config);

// Access defaults
console.log(DEFAULT_CONFIG);
console.log(\`Config file: \${CONFIG_FILENAME}\`);`;
}
