import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalloutComponent } from '../../../components/callout.component';

@Component({
  selector: 'app-slash-commands',
  imports: [RouterLink, CalloutComponent],
  template: `
    <article class="prose max-w-none">
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">AI Prompt File</h1>
      <p class="mt-4 text-lg leading-relaxed text-surface-600">
        Prodara generates a single AI prompt file for your agent when you run
        <code>prodara init --ai &lt;agent&gt;</code>. This one file teaches your agent the entire
        Prodara lifecycle — from specification to deployment.
      </p>

      <app-callout variant="info">
        The prompt file is generated for all
        <a routerLink="/docs/agent-integration" class="underline">26 supported AI agents</a>.
        Each agent gets the file in its native format (<code>.prompt.md</code>, <code>.mdc</code>,
        <code>.md</code>, etc.).
      </app-callout>

      <!-- What's In the Prompt -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">What's In the Prompt</h2>
      <p class="mt-2 text-surface-600">
        The prompt file contains a complete 8-phase lifecycle that your AI agent follows end-to-end:
      </p>
      <div class="mt-4 overflow-x-auto not-prose">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-surface-200">
              <th class="pb-2 text-left font-semibold text-surface-950">Phase</th>
              <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
            </tr>
          </thead>
          <tbody class="text-surface-600">
            @for (phase of phases; track phase.name) {
              <tr class="border-b border-surface-100">
                <td class="py-2 font-mono text-sm text-primary-700">{{ phase.name }}</td>
                <td class="py-2">{{ phase.desc }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- How to Use -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">How to Use</h2>
      <p class="mt-2 text-surface-600">
        Just invoke the prompt in your AI agent and describe what you want:
      </p>
      <div class="mt-4 space-y-3 not-prose">
        @for (example of examples; track example) {
          <div class="rounded-lg border border-surface-200 bg-surface-50 px-4 py-3">
            <code class="text-sm text-surface-700">{{ example }}</code>
          </div>
        }
      </div>
      <p class="mt-4 text-surface-600">
        Your agent automatically walks through all 8 phases — clarifying your intent, writing
        <code>.prd</code> specifications, compiling, validating, implementing, reviewing, and
        delivering production-ready code.
      </p>

      <!-- Platform File Formats -->
      <h2 class="mt-12 text-2xl font-bold text-surface-950">Platform File Formats</h2>
      <p class="mt-2 text-surface-600">
        Each AI agent uses a different directory and file extension.
        <code>prodara init --ai &lt;agent&gt;</code> generates the file in the correct format automatically.
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
        like Explore, Help, and Party that the prompt supports.
      </p>
    </article>
  `,
})
export class SlashCommandsComponent {
  readonly phases = [
    { name: '1. Clarify', desc: 'Identify ambiguities and ask targeted questions before writing any code' },
    { name: '2. Specify', desc: 'Write .prd specification files using the Prodara language' },
    { name: '3. Validate', desc: 'Compile and type-check using prodara build --format json' },
    { name: '4. Build', desc: 'Generate the Product Graph with semantic diffing and impact analysis' },
    { name: '5. Govern', desc: 'Apply constitution, security, privacy, and compliance policies' },
    { name: '6. Implement', desc: 'Generate production-ready code from the validated Product Graph' },
    { name: '7. Review', desc: 'Run 9 built-in reviewers (architecture, security, code-quality, etc.)' },
    { name: '8. Deliver', desc: 'Final verification, test coverage check, and deployment readiness' },
  ];

  readonly examples = [
    '/Prodara Build me a SaaS billing system with Stripe integration',
    '/Prodara Add a dashboard surface to the analytics module',
    '/Prodara Review the security governance for the payments module',
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
