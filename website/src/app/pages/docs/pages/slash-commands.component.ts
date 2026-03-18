import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-slash-commands',
  imports: [RouterLink, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">Slash Commands</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara generates 29 slash command files for your AI agent when you run
        <code>prodara init --ai &lt;agent&gt;</code>. Commands are organized into four categories
        and adapted to each agent's file format.
      </p>

      <app-callout variant="info">
        Slash commands are generated for all
        <a routerLink="/docs/agent-integration" class="underline">26 supported AI agents</a>.
        Each agent gets files in its native format (<code>.prompt.md</code>, <code>.mdc</code>,
        <code>.md</code>, etc.).
      </app-callout>

      <!-- Workflow Commands -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Workflow Commands</h2>
      <p class="mt-2 text-surface-600">
        Core commands that drive the specification-to-implementation pipeline.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Command</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (cmd of workflowCommands; track cmd.name) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ cmd.name }}</td>
                <td class="py-2">{{ cmd.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Spec-Edit Commands -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Spec-Edit Commands</h2>
      <p class="mt-2 text-surface-600">
        Structured editing commands that modify <code>.prd</code> files through the product graph.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Command</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (cmd of specEditCommands; track cmd.name) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ cmd.name }}</td>
                <td class="py-2">{{ cmd.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Query Commands -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Query Commands</h2>
      <p class="mt-2 text-surface-600">
        Read-only commands for understanding and analyzing specifications.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Command</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (cmd of queryCommands; track cmd.name) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ cmd.name }}</td>
                <td class="py-2">{{ cmd.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Management Commands -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Management Commands</h2>
      <p class="mt-2 text-surface-600">
        Commands for project setup, extensions, and onboarding.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Command</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (cmd of managementCommands; track cmd.name) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ cmd.name }}</td>
                <td class="py-2">{{ cmd.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Platform File Formats -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Platform File Formats</h2>
      <p class="mt-2 text-surface-600">
        Each AI agent uses a different directory and file extension for slash commands.
        <code>prodara init --ai &lt;agent&gt;</code> generates files in the correct format automatically.
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Agent</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Directory</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Extension</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (p of platforms; track p.agent) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-medium text-surface-900">{{ p.agent }}</td>
                <td class="py-2 font-mono text-sm">{{ p.dir }}</td>
                <td class="py-2 font-mono text-sm">{{ p.ext }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <h2 class="mt-12 text-2xl font-bold text-surface-950">Next Steps</h2>
      <p class="text-surface-600">
        Learn about
        <a routerLink="/docs/interactive-modes" class="text-primary-600 hover:underline">interactive modes</a>
        like Explore, Help, and Party that are triggered via slash commands.
      </p>
    </article>
  `,
})
export class SlashCommandsComponent {
  readonly workflowCommands = [
    { name: '/prodara:build', desc: 'Run the full compilation and validation pipeline' },
    { name: '/prodara:validate', desc: 'Parse and validate .prd specifications' },
    { name: '/prodara:constitution', desc: 'Read the project constitution' },
    { name: '/prodara:specify', desc: 'Create or modify .prd specification files' },
    { name: '/prodara:plan', desc: 'Review the implementation plan' },
    { name: '/prodara:implement', desc: 'Execute the implementation plan' },
    { name: '/prodara:clarify', desc: 'Identify and resolve ambiguities in the spec' },
    { name: '/prodara:review', desc: 'Run the review loop with all enabled reviewers' },
    { name: '/prodara:propose "<desc>"', desc: 'Create a new change proposal' },
    { name: '/prodara:explore <topic>', desc: 'Read-only investigation of a topic in the product graph' },
    { name: '/prodara:party <topic>', desc: 'Multi-perspective discussion from reviewer agents' },
  ];

  readonly specEditCommands = [
    { name: '/prodara:add-module <name>', desc: 'Add a new module to the specification' },
    { name: '/prodara:add-entity <module> <name>', desc: 'Add an entity to a module' },
    { name: '/prodara:add-workflow <module> <name>', desc: 'Add a workflow to a module' },
    { name: '/prodara:add-screen <module> <name>', desc: 'Add a surface/screen to a module' },
    { name: '/prodara:add-policy <module> <name>', desc: 'Add a policy or rule to a module' },
    { name: '/prodara:rename <old> <new>', desc: 'Rename a node in the product graph' },
    { name: '/prodara:move <node> <target>', desc: 'Move a node between modules' },
  ];

  readonly queryCommands = [
    { name: '/prodara:explain <node-id>', desc: 'Explain any node in the product graph' },
    { name: '/prodara:why <diagnostic-code>', desc: 'Explain a diagnostic code (e.g. PRD0301)' },
    { name: '/prodara:graph', desc: 'Visualize the product graph structure' },
    { name: '/prodara:diff', desc: 'Show semantic diff of specification changes' },
    { name: '/prodara:drift', desc: 'Check for specification drift from implementation' },
    { name: '/prodara:analyze', desc: 'Run consistency and metrics analysis' },
    { name: '/prodara:checklist', desc: 'Generate a completion quality checklist' },
  ];

  readonly managementCommands = [
    { name: '/prodara:help', desc: 'Contextual guidance based on project state' },
    { name: '/prodara:onboard', desc: 'Interactive onboarding for new team members' },
    { name: '/prodara:extensions', desc: 'Manage installed extensions' },
    { name: '/prodara:presets', desc: 'Manage configuration presets' },
  ];

  readonly platforms = [
    { agent: 'GitHub Copilot', dir: '.github/prompts/', ext: '.prompt.md' },
    { agent: 'Claude Code', dir: '.claude/commands/', ext: '.md' },
    { agent: 'Cursor', dir: '.cursor/rules/', ext: '.mdc' },
    { agent: 'OpenCode', dir: '.opencode/prompts/', ext: '.md' },
    { agent: 'Codex', dir: '.codex/prompts/', ext: '.md' },
    { agent: 'Gemini', dir: '.gemini/prompts/', ext: '.md' },
    { agent: 'Windsurf', dir: '.windsurf/prompts/', ext: '.md' },
    { agent: 'Kiro', dir: '.kiro/prompts/', ext: '.md' },
    { agent: 'Jules', dir: '.jules/prompts/', ext: '.md' },
    { agent: 'Amp', dir: '.amp/prompts/', ext: '.md' },
    { agent: 'Roo', dir: '.roo/commands/', ext: '.md' },
    { agent: 'Aider', dir: '.aider/prompts/', ext: '.md' },
    { agent: 'Cline', dir: '.cline/prompts/', ext: '.md' },
    { agent: 'Continue', dir: '.continue/prompts/', ext: '.md' },
    { agent: 'Zed', dir: '.zed/prompts/', ext: '.md' },
    { agent: 'Bolt', dir: '.bolt/prompts/', ext: '.md' },
    { agent: 'Aide', dir: '.aide/prompts/', ext: '.md' },
    { agent: 'Trae', dir: '.trae/prompts/', ext: '.md' },
    { agent: 'Augment', dir: '.augment/prompts/', ext: '.md' },
    { agent: 'Sourcegraph', dir: '.sourcegraph/prompts/', ext: '.md' },
    { agent: 'Tabnine', dir: '.tabnine/prompts/', ext: '.md' },
    { agent: 'Supermaven', dir: '.supermaven/prompts/', ext: '.md' },
    { agent: 'Void', dir: '.void/prompts/', ext: '.md' },
    { agent: 'Pear', dir: '.pear/prompts/', ext: '.md' },
    { agent: 'Double', dir: '.double/prompts/', ext: '.md' },
    { agent: 'Generic', dir: '.ai/commands/', ext: '.md' },
  ];
}
