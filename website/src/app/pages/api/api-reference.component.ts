import { Component } from '@angular/core';
import { CodeBlockComponent } from '../../components/code-block.component';

@Component({
  selector: 'app-api-reference',
  imports: [CodeBlockComponent],
  template: `
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-surface-950">API Reference</h1>
      <p class="mt-4 text-lg text-surface-600">
        The <code>&#64;prodara/compiler</code> package exports 200+ functions and types for
        programmatic access to the compilation pipeline.
      </p>

      <app-code-block code="npm install @prodara/compiler" language="bash" />

      <!-- API sections -->
      @for (section of sections; track section.title) {
        <section class="mt-12">
          <h2 class="text-2xl font-bold text-surface-950">{{ section.title }}</h2>
          <p class="mt-2 text-surface-600">{{ section.desc }}</p>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-surface-200">
                  <th class="pb-2 text-left font-semibold text-surface-950">Export</th>
                  <th class="pb-2 text-left font-semibold text-surface-950">Description</th>
                </tr>
              </thead>
              <tbody class="text-surface-600">
                @for (item of section.items; track item.name) {
                  <tr class="border-b border-surface-100">
                    <td class="py-2 font-mono text-sm text-primary-700">{{ item.name }}</td>
                    <td class="py-2">{{ item.desc }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- Usage example -->
      <section class="mt-12">
        <h2 class="text-2xl font-bold text-surface-950">Usage Example</h2>
        <app-code-block [code]="usageExample" language="typescript" filename="build.ts" />
      </section>
    </div>
  `,
})
export class ApiReferenceComponent {
  readonly sections = [
    {
      title: 'Core Pipeline',
      desc: 'Top-level compilation functions.',
      items: [
        { name: 'compile()', desc: 'Run the full compilation pipeline on a set of .prd files.' },
        { name: 'runPipeline()', desc: 'Execute a custom subset of compilation phases.' },
        { name: 'PIPELINE_PHASES', desc: 'Ordered array of all 15 compilation phases.' },
      ],
    },
    {
      title: 'Graph',
      desc: 'Product Graph construction and manipulation.',
      items: [
        { name: 'buildGraph()', desc: 'Build a Product Graph from a bound and type-checked AST.' },
        { name: 'serializeGraph()', desc: 'Serialize a Product Graph to JSON.' },
        { name: 'validateGraph()', desc: 'Validate structural integrity and semantic rules.' },
        { name: 'ProductGraph', desc: 'Type representing the full compiled graph.' },
        { name: 'ProductNode', desc: 'A node in the Product Graph with semantic ID.' },
        { name: 'GraphEdge', desc: 'A typed edge connecting two graph nodes.' },
      ],
    },
    {
      title: 'Planning',
      desc: 'Incremental change analysis and impact propagation.',
      items: [
        { name: 'diffGraphs()', desc: 'Compare two Product Graphs and produce a change set.' },
        { name: 'propagateImpact()', desc: 'Follow graph edges to find downstream impacts.' },
        { name: 'createPlan()', desc: 'Generate an incremental plan with tasks.' },
      ],
    },
    {
      title: 'Workflow Execution',
      desc: 'Build phase orchestration.',
      items: [
        { name: 'runWorkflow()', desc: 'Execute the full build workflow.' },
        { name: 'runReviewers()', desc: 'Execute all review phases.' },
        { name: 'runSpecTests()', desc: 'Run specification-level tests.' },
      ],
    },
    {
      title: 'Extensions & Presets',
      desc: 'Plugin and preset management.',
      items: [
        { name: 'ExtensionRegistry', desc: 'Registry for managing loaded extensions.' },
        { name: 'loadExtensions()', desc: 'Load extensions from the registry.' },
        { name: 'installExtension()', desc: 'Install an extension package.' },
        { name: 'loadPresets()', desc: 'Load constitution presets.' },
        { name: 'installPreset()', desc: 'Install a preset package.' },
      ],
    },
    {
      title: 'Lexer & Parser',
      desc: 'Low-level compilation primitives.',
      items: [
        { name: 'Lexer', desc: 'Tokenizer for .prd source files.' },
        { name: 'Parser', desc: 'AST builder from token streams.' },
        { name: 'bind()', desc: 'Create symbol table from AST.' },
        { name: 'checkTypes()', desc: 'Run type checker on bound AST.' },
        { name: 'validate()', desc: 'Run semantic validation rules.' },
      ],
    },
    {
      title: 'Diagnostics',
      desc: 'Error and warning management.',
      items: [
        { name: 'DiagnosticBag', desc: 'Accumulator for compiler diagnostics.' },
        { name: 'Diagnostic', desc: 'A single diagnostic with code, severity, and location.' },
        { name: 'formatDiagnostics()', desc: 'Format diagnostics for human or JSON output.' },
      ],
    },
    {
      title: 'Agent & Prompt Generation',
      desc: 'AI agent integration and prompt file generation.',
      items: [
        { name: 'PHASE_RENDERERS', desc: 'Map of 18 template IDs to render functions for prompt generation.' },
        { name: 'renderTemplate()', desc: 'Render a prompt template for a specific agent.' },
        { name: 'renderAllTemplates()', desc: 'Generate the complete prompt content for a target agent platform.' },
        { name: 'AgentPlatform', desc: 'Union type of all 26 supported AI agent platforms.' },
        { name: 'PhaseId', desc: 'Union type of all template phase identifiers.' },
      ],
    },
    {
      title: 'Templates',
      desc: 'Prompt template system.',
      items: [
        { name: 'TemplateContext', desc: 'Context object passed to template renderers.' },
        { name: 'BuildContext', desc: 'Context for the build command template.' },
        { name: 'ExploreContext', desc: 'Context for the explore mode template.' },
        { name: 'PartyContext', desc: 'Context for the party mode template.' },
        { name: 'DesignContext', desc: 'Context for the design mode template.' },
        { name: 'OnboardContext', desc: 'Context for the onboard mode template.' },
      ],
    },
    {
      title: 'Configuration',
      desc: 'Compiler configuration management.',
      items: [
        { name: 'loadConfig()', desc: 'Load configuration from prodara.config.json.' },
        { name: 'resolveConfig()', desc: 'Resolve configuration with defaults and presets.' },
        { name: 'DEFAULT_CONFIG', desc: 'Built-in default configuration values.' },
        { name: 'ProdaraConfig', desc: 'Type representing the full configuration schema.' },
        { name: 'WorkflowSchema', desc: 'Type for custom workflow definitions.' },
      ],
    },
    {
      title: 'Marketplace',
      desc: 'Extension and preset marketplace.',
      items: [
        { name: 'searchMarketplace()', desc: 'Search the Prodara marketplace for extensions.' },
        { name: 'npmInstall()', desc: 'Install an extension package via npm.' },
        { name: 'npmRemove()', desc: 'Remove an installed extension package.' },
        { name: 'MarketplaceEntry', desc: 'Type representing a marketplace listing.' },
        { name: 'MarketplaceCategory', desc: 'Category enum for marketplace entries.' },
      ],
    },
    {
      title: 'Reviewers',
      desc: 'Review pipeline and built-in reviewer agents.',
      items: [
        { name: 'runReviewers()', desc: 'Execute all enabled reviewers against the current build.' },
        { name: 'runReviewFixLoop()', desc: 'Run the review-fix loop with auto-fix capabilities.' },
        { name: 'DEFAULT_REVIEWERS', desc: 'Array of 9 built-in reviewer agents.' },
        { name: 'discoverCustomReviewers()', desc: 'Discover custom reviewer definitions from .prodara/reviewers/.' },
        { name: 'ReviewerAgent', desc: 'Type representing a reviewer agent with perspective and prompt.' },
      ],
    },
    {
      title: 'Proposals',
      desc: 'Change proposal management.',
      items: [
        { name: 'createProposal()', desc: 'Create a new change proposal in .prodara/changes/.' },
        { name: 'listProposals()', desc: 'List all active proposals.' },
        { name: 'applyProposal()', desc: 'Apply an approved proposal to the main specification.' },
        { name: 'archiveProposal()', desc: 'Archive a proposal without applying it.' },
        { name: 'ChangeProposal', desc: 'Type representing a change proposal with metadata.' },
      ],
    },
  ];

  readonly usageExample = `import { compile } from '@prodara/compiler';

const result = await compile({
  rootDir: './my-project',
  format: 'json',
});

if (result.diagnostics.errors.length > 0) {
  console.error('Compilation failed:', result.diagnostics);
  process.exit(1);
}

// Access the Product Graph
const graph = result.graph;
console.log(\`Compiled \${graph.modules.length} modules\`);
console.log(\`\${graph.edges.length} edges in graph\`);`;
}
