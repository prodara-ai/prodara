import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../../components/code-block.component';

@Component({
  selector: 'app-cli-usage',
  imports: [RouterLink, CodeBlockComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">CLI Usage</h1>
      <p class="mt-4 text-lg text-surface-600">
        The Prodara CLI provides commands for building, validating, and inspecting your specifications.
        All commands support <code>--format json</code> for machine-readable output.
      </p>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Installation</h2>
      <app-code-block code="npm install -g @prodara/cli" language="bash" />

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Commands</h2>

      @for (cmd of commands; track cmd.name) {
        <div class="mt-8">
          <h3 class="text-xl font-semibold text-surface-950">
            <code class="rounded bg-surface-100 px-2 py-0.5 text-primary-700">prodara {{ cmd.name }}</code>
          </h3>
          <p class="mt-2 text-surface-600">{{ cmd.desc }}</p>
          <app-code-block [code]="cmd.example" language="bash" />
        </div>
      }

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Global Flags</h2>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-sm text-surface-700">
          <thead>
            <tr class="border-b border-surface-200 text-left font-semibold text-surface-950">
              <th class="pb-2 pr-6">Flag</th>
              <th class="pb-2">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-100">
            <tr><td class="py-2 pr-6"><code>--format human|json</code></td><td>Output format (default: human)</td></tr>
            <tr><td class="py-2 pr-6"><code>--output &lt;path&gt;</code></td><td>Write output to a file instead of stdout</td></tr>
            <tr><td class="py-2 pr-6"><code>--config &lt;path&gt;</code></td><td>Path to prodara.config.json</td></tr>
            <tr><td class="py-2 pr-6"><code>--no-color</code></td><td>Disable colored output</td></tr>
            <tr><td class="py-2 pr-6"><code>--verbose</code></td><td>Enable detailed logging</td></tr>
            <tr><td class="py-2 pr-6"><code>--help</code></td><td>Show usage for any command</td></tr>
          </tbody>
        </table>
      </div>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Output Formats</h2>
      <p class="mt-2 text-surface-600">
        All commands support two output formats:
      </p>
      <ul class="mt-2 space-y-1 text-surface-600">
        <li><code>--format human</code> - Pretty-printed output for terminal use (default)</li>
        <li><code>--format json</code> - Structured JSON for AI agents and CI pipelines</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Exit Codes</h2>
      <ul class="mt-2 space-y-1 text-surface-600">
        <li><code>0</code> - Success (no errors)</li>
        <li><code>1</code> - Compilation errors or drift detected</li>
        <li><code>2</code> - Invalid usage or missing arguments</li>
      </ul>

      <h2 class="mt-10 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        See how the
        <a routerLink="/docs/slash-commands" class="text-primary-600 hover:underline">AI prompt file</a>
        drives agent workflows, or configure
        <a routerLink="/docs/workflows" class="text-primary-600 hover:underline">custom workflows</a>
        for your build pipeline.
      </p>
    </article>
  `,
})
export class CliUsageComponent {
  readonly commands = [
    {
      name: 'build',
      desc: 'Run the full compilation pipeline. This is the default command - running `prodara` with no subcommand is equivalent to `prodara build`. Includes validate, graph, plan, workflow, review, and verify phases.',
      example: 'prodara build --format json ./my-project',
    },
    {
      name: 'init',
      desc: 'Scaffold a new Prodara project from a template. Choose from: minimal, saas, marketplace, internal-tool, api.',
      example: 'prodara init my-project --template saas',
    },
    {
      name: 'upgrade',
      desc: 'Update an existing Prodara project to the latest version. Adds missing config keys, creates new directories, updates the compiler, and regenerates the AI prompt file.',
      example: 'prodara upgrade --ai copilot',
    },
    {
      name: 'validate',
      desc: 'Parse and type-check .prd files without producing a Product Graph. Useful for quick error checking during development.',
      example: 'prodara validate --format json ./project',
    },
    {
      name: 'graph',
      desc: 'Compile and emit the Product Graph as JSON. The graph contains all nodes, 40+ edge types, and build metadata.',
      example: 'prodara graph --output build/graph.json ./project',
    },
    {
      name: 'plan',
      desc: 'Diff the current spec against the last build and produce an incremental plan with change classification and impact analysis.',
      example: 'prodara plan --format json ./project',
    },
    {
      name: 'diff',
      desc: 'Show enriched semantic differences between the current spec and the last build. Categorizes changes as structural, behavioral, or policy changes.',
      example: 'prodara diff --format json ./project',
    },
    {
      name: 'test',
      desc: 'Run specification-level tests defined in your .prd files. Tests validate transitions, authorization, and rules against the Product Graph.',
      example: 'prodara test --format json ./project',
    },
    {
      name: 'review',
      desc: 'Run the reviewer pipeline with all enabled reviewers (up to 9 built-in). Includes the fix loop with configurable iterations.',
      example: 'prodara review --format json ./project',
    },
    {
      name: 'doctor',
      desc: 'Check installation health: compiler version, Node.js version, file count, and configuration status.',
      example: 'prodara doctor',
    },
    {
      name: 'drift',
      desc: 'Detect whether specs have changed since the last build. Returns exit code 1 if the spec has drifted from the stored graph.',
      example: 'prodara drift ./project',
    },
    {
      name: 'dashboard',
      desc: 'Display a project overview with module count, entity count, workflow count, surface count, and other aggregate statistics.',
      example: 'prodara dashboard --format json ./project',
    },
    {
      name: 'analyze',
      desc: 'Run consistency and coverage analysis on your spec. Checks cross-module coupling, missing tests, and structural issues.',
      example: 'prodara analyze --format json ./project',
    },
    {
      name: 'checklist',
      desc: 'Generate a quality validation checklist organized by category. Useful for pre-release reviews.',
      example: 'prodara checklist --format json ./project',
    },
    {
      name: 'onboard',
      desc: 'Generate a guided project walkthrough for new team members. Auto-generated from the Product Graph structure.',
      example: 'prodara onboard --format json ./project',
    },
    {
      name: 'history',
      desc: 'Browse past builds with phase status tracking. Useful for auditing changes over time.',
      example: 'prodara history --format json ./project',
    },
    {
      name: 'init --ai <agent>',
      desc: 'Generate an AI prompt file for your agent. Supports 26+ agents including copilot, claude, cursor, windsurf, and more.',
      example: 'prodara init --ai copilot',
    },
    {
      name: 'propose "<description>"',
      desc: 'Create a new change proposal in .prodara/changes/. The proposal gets its own delta.prd for isolated spec changes.',
      example: 'prodara propose "Add payment processing"',
    },
    {
      name: 'apply <change>',
      desc: 'Test-compile and apply a change proposal. Merges the delta.prd into the main spec after validation.',
      example: 'prodara apply add-payment-processing',
    },
    {
      name: 'archive',
      desc: 'Archive a completed or rejected change proposal.',
      example: 'prodara archive add-payment-processing',
    },
    {
      name: 'extensions install <name>',
      desc: 'Install an extension from npm. Extensions add reviewers, generators, validators, and more.',
      example: 'prodara extensions install @my-org/prodara-ext-react',
    },
    {
      name: 'extensions list',
      desc: 'List all installed extensions and their capabilities.',
      example: 'prodara extensions list',
    },
    {
      name: 'extensions remove <name>',
      desc: 'Remove an installed extension.',
      example: 'prodara extensions remove @my-org/prodara-ext-react',
    },
    {
      name: 'extensions search <query>',
      desc: 'Search the npm registry for Prodara extensions.',
      example: 'prodara extensions search react',
    },
    {
      name: 'build --workflow <name>',
      desc: 'Run a named custom workflow instead of the default full pipeline. Define workflows in prodara.config.json.',
      example: 'prodara build --workflow quick-check ./project',
    },
  ];
}
