// ---------------------------------------------------------------------------
// Prodara CLI — Agent Slash Command Generation
// ---------------------------------------------------------------------------
// Generates AI agent-specific slash command files during `prodara init --ai`.
// Supports 26 AI agent platforms including Copilot, Claude, Cursor, Gemini,
// Windsurf, Codex, OpenCode, Amp, Roo, Kiro, Jules, Aider, Cline,
// Continue, Zed, Bolt, Aide, Trae, Augment, Sourcegraph, Tabnine,
// Supermaven, Void, PearAI, Double, and a generic fallback.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentId =
  | 'claude'
  | 'copilot'
  | 'cursor'
  | 'gemini'
  | 'windsurf'
  | 'codex'
  | 'opencode'
  | 'amp'
  | 'roo'
  | 'kiro'
  | 'jules'
  | 'aider'
  | 'cline'
  | 'continue'
  | 'zed'
  | 'bolt'
  | 'aide'
  | 'trae'
  | 'augment'
  | 'sourcegraph'
  | 'tabnine'
  | 'supermaven'
  | 'void'
  | 'pear'
  | 'double'
  | 'generic';

export interface AgentCommandConfig {
  readonly agentId: AgentId;
  readonly commandsDir: string;
  readonly commandExtension: string;
  readonly frontmatterStyle: 'yaml' | 'none';
  readonly needsToolsField: boolean;
}

export interface SlashCommandFile {
  readonly path: string;
  readonly content: string;
}

// ---------------------------------------------------------------------------
// Agent Configurations
// ---------------------------------------------------------------------------

const AGENT_CONFIGS: Readonly<Record<AgentId, AgentCommandConfig>> = {
  copilot: {
    agentId: 'copilot',
    commandsDir: '.github/prompts',
    commandExtension: '.prompt.md',
    frontmatterStyle: 'yaml',
    needsToolsField: true,
  },
  claude: {
    agentId: 'claude',
    commandsDir: '.claude/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  cursor: {
    agentId: 'cursor',
    commandsDir: '.cursor/rules',
    commandExtension: '.mdc',
    frontmatterStyle: 'yaml',
    needsToolsField: false,
  },
  gemini: {
    agentId: 'gemini',
    commandsDir: '.gemini/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  windsurf: {
    agentId: 'windsurf',
    commandsDir: '.windsurf/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  codex: {
    agentId: 'codex',
    commandsDir: '.codex',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  opencode: {
    agentId: 'opencode',
    commandsDir: '.opencode/agent',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  amp: {
    agentId: 'amp',
    commandsDir: '.amp/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  roo: {
    agentId: 'roo',
    commandsDir: '.roo/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  kiro: {
    agentId: 'kiro',
    commandsDir: '.kiro/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  jules: {
    agentId: 'jules',
    commandsDir: '.jules/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  aider: {
    agentId: 'aider',
    commandsDir: '.aider/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  cline: {
    agentId: 'cline',
    commandsDir: '.cline/rules',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  continue: {
    agentId: 'continue',
    commandsDir: '.continue/rules',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  zed: {
    agentId: 'zed',
    commandsDir: '.zed/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  bolt: {
    agentId: 'bolt',
    commandsDir: '.bolt/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  aide: {
    agentId: 'aide',
    commandsDir: '.aide/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  trae: {
    agentId: 'trae',
    commandsDir: '.trae/rules',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  augment: {
    agentId: 'augment',
    commandsDir: '.augment/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  sourcegraph: {
    agentId: 'sourcegraph',
    commandsDir: '.sourcegraph/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  tabnine: {
    agentId: 'tabnine',
    commandsDir: '.tabnine/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  supermaven: {
    agentId: 'supermaven',
    commandsDir: '.supermaven/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  void: {
    agentId: 'void',
    commandsDir: '.void/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  pear: {
    agentId: 'pear',
    commandsDir: '.pear/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  double: {
    agentId: 'double',
    commandsDir: '.double/prompts',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
  generic: {
    agentId: 'generic',
    commandsDir: '.ai/commands',
    commandExtension: '.md',
    frontmatterStyle: 'none',
    needsToolsField: false,
  },
};

// ---------------------------------------------------------------------------
// Slash command definitions
// ---------------------------------------------------------------------------

interface CommandDef {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly category: 'workflow' | 'query' | 'spec-edit' | 'management';
  readonly instructions: string;
}

function getCommandDefs(productName: string): readonly CommandDef[] {
  return [
    // -- Workflow commands --
    {
      slug: 'build',
      title: 'Full Build Pipeline',
      description: 'Run the full build pipeline: compile → workflow → review → verify',
      category: 'workflow',
      instructions: [
        `Run the full Prodara build pipeline for "${productName}":`,
        '',
        '```bash',
        'prodara build',
        '```',
        '',
        'This compiles all .prd files, builds the product graph,',
        'runs the workflow engine, review loop, and verification.',
      ].join('\n'),
    },
    {
      slug: 'validate',
      title: 'Validate Specification',
      description: 'Parse and validate .prd files without running the full pipeline',
      category: 'workflow',
      instructions: [
        'Validate the Prodara specification files:',
        '',
        '```bash',
        'prodara validate --format human',
        '```',
        '',
        'This checks for syntax errors, type errors, and semantic issues',
        'without running implementation or review phases.',
      ].join('\n'),
    },
    {
      slug: 'constitution',
      title: 'Read Product Constitution',
      description: 'Read product constitution and governance rules from .prd files',
      category: 'workflow',
      instructions: [
        `Read the .prd specification files in this project to understand the product "${productName}".`,
        'Focus on:',
        '- The `product` block for high-level product definition',
        '- Any `constitution` blocks for governance rules and constraints',
        '- Module structure and entity relationships',
        '',
        'After reading, summarize:',
        '1. Product name and purpose',
        '2. Modules and their responsibilities',
        '3. Key governance rules and constraints',
        '4. Cross-module relationships',
      ].join('\n'),
    },
    {
      slug: 'specify',
      title: 'Create Specification',
      description: 'Create or modify .prd specification files',
      category: 'workflow',
      instructions: [
        `You are working on "${productName}", which uses the Prodara specification language (.prd files).`,
        '',
        '## .prd Language Quick Reference',
        '- `product <name> { title, version, modules }` — Top-level product definition',
        '- `module <name> { ... }` — Logical grouping of entities, workflows, surfaces',
        '- `entity <name> { field: type }` — Data model with typed fields',
        '- `workflow <name> { steps }` — Business process definition',
        '- `surface <name> { sections }` — UI surface specification',
        '- `event <name> { fields }` — Domain event definition',
        '- `integration <name> { endpoints }` — External service integration',
        '- Primitive types: `string`, `int`, `float`, `boolean`, `uuid`, `datetime`, `money`',
        '- Generic wrappers: `list<T>`, `optional<T>`, `map<K,V>`',
        '',
        '## Workflow',
        '1. Create or edit .prd files following the language spec above',
        '2. Run `prodara validate` to check for syntax and type errors',
        '3. Run `prodara graph` to visualize the product graph',
        '4. Run `prodara build` to compile and plan implementation',
      ].join('\n'),
    },
    {
      slug: 'plan',
      title: 'Review Implementation Plan',
      description: 'Run `prodara plan` and review the incremental plan',
      category: 'workflow',
      instructions: [
        'Run the Prodara planner to generate an incremental implementation plan:',
        '',
        '```bash',
        'prodara plan --format json',
        '```',
        '',
        'Review the output and explain:',
        '1. What changes are planned (added, modified, removed nodes)',
        '2. Which modules are affected',
        '3. Task ordering and dependencies',
        '4. Any potential risks or conflicts',
        '',
        'If there is no previous build, use `prodara plan --format human` for a readable overview.',
      ].join('\n'),
    },
    {
      slug: 'implement',
      title: 'Implement Plan',
      description: 'Run `prodara build` to implement plan tasks',
      category: 'workflow',
      instructions: [
        'Run the full Prodara build pipeline:',
        '',
        '```bash',
        'prodara build',
        '```',
        '',
        'This will:',
        '1. Compile .prd files into a Product Graph',
        '2. Diff against the previous graph to detect changes',
        '3. Generate an implementation plan with ordered tasks',
        '4. Produce implementation instructions for each task',
        '',
        'Follow the implementation instructions for each task in order.',
        'After completing each task, run `prodara validate` to verify correctness.',
      ].join('\n'),
    },
    {
      slug: 'clarify',
      title: 'Clarify Ambiguities',
      description: 'Run `prodara build` in clarify mode to resolve ambiguity questions',
      category: 'workflow',
      instructions: [
        'Run Prodara to identify ambiguities in the specification:',
        '',
        '```bash',
        'prodara build --auto-clarify',
        '```',
        '',
        'Review the clarify phase output for questions about:',
        '- Missing field types or defaults',
        '- Ambiguous entity relationships',
        '- Unclear workflow steps',
        '- Underspecified authorization rules',
        '',
        'For each question, either:',
        '1. Update the .prd file to resolve the ambiguity',
        '2. Document the decision as a comment in the spec',
      ].join('\n'),
    },
    {
      slug: 'review',
      title: 'Run Review',
      description: 'Run the review loop only, without full build',
      category: 'workflow',
      instructions: [
        'Run the review phase against the current product graph:',
        '',
        '```bash',
        'prodara build --only review',
        '```',
        '',
        'Reviews the specification from multiple perspectives:',
        'architecture, security, code quality, test quality, and UX quality.',
        'Reports findings with severity levels and suggestions.',
      ].join('\n'),
    },
    {
      slug: 'propose',
      title: 'Create Change Proposal',
      description: 'Create a structured change proposal with impact analysis',
      category: 'workflow',
      instructions: [
        `Create a change proposal for "${productName}":`,
        '',
        '```bash',
        'prodara propose "<description>"',
        '```',
        '',
        'This generates:',
        '- proposal.md — structured change description',
        '- delta.prd — specification changes',
        '- tasks.md — implementation task list',
        '',
        'Review the proposal and approve or modify before implementation.',
      ].join('\n'),
    },
    {
      slug: 'explore',
      title: 'Exploration Mode',
      description: 'Explore a topic within the product graph context',
      category: 'workflow',
      instructions: [
        `Explore a topic within the context of "${productName}".`,
        '',
        'Analyze the current product graph and specification to:',
        '1. Understand existing entities, workflows, and relationships',
        '2. Suggest possible approaches or enhancements',
        '3. Highlight trade-offs and considerations',
        '4. Identify affected modules and dependencies',
        '',
        'This is a read-only investigation — no files are modified.',
      ].join('\n'),
    },
    {
      slug: 'party',
      title: 'Party Mode',
      description: 'Multi-perspective discussion from reviewer agents',
      category: 'workflow',
      instructions: [
        'Run a multi-perspective party discussion:',
        '',
        '```bash',
        'prodara party "<topic>"',
        '```',
        '',
        'Each reviewer agent provides its analysis from a unique perspective:',
        '- Architecture, Security, Code Quality, Test Quality, UX',
        '- Custom reviewers if configured',
        '',
        'The discussion concludes with a synthesis of all perspectives.',
      ].join('\n'),
    },

    // -- Spec editing commands --
    {
      slug: 'add-module',
      title: 'Add Module',
      description: 'Add a new module to the .prd specification',
      category: 'spec-edit',
      instructions: [
        'Add a new module to the product specification.',
        '',
        'Create a new .prd file for the module with the basic structure:',
        '```',
        'module <name> {',
        '  // entities, workflows, surfaces',
        '}',
        '```',
        '',
        'Then add the module name to the product block\'s `modules` list.',
        'Run `prodara validate` to verify the new module is correct.',
      ].join('\n'),
    },
    {
      slug: 'add-entity',
      title: 'Add Entity',
      description: 'Add a new entity to a module',
      category: 'spec-edit',
      instructions: [
        'Add a new entity to an existing module:',
        '',
        '```',
        'entity <name> {',
        '  id: uuid',
        '  // Add fields with types',
        '}',
        '```',
        '',
        'Ensure the entity is placed inside the correct module block.',
        'Run `prodara validate` after adding.',
      ].join('\n'),
    },
    {
      slug: 'add-workflow',
      title: 'Add Workflow',
      description: 'Add a new workflow to a module',
      category: 'spec-edit',
      instructions: [
        'Add a new workflow to an existing module:',
        '',
        '```',
        'workflow <name> {',
        '  // Define steps, triggers, and emissions',
        '}',
        '```',
        '',
        'Connect the workflow to relevant entities via reads/writes edges.',
        'Run `prodara validate` after adding.',
      ].join('\n'),
    },
    {
      slug: 'add-screen',
      title: 'Add Screen / Surface',
      description: 'Add a new screen or surface to a module',
      category: 'spec-edit',
      instructions: [
        'Add a new surface (screen/page) to an existing module:',
        '',
        '```',
        'surface <name> {',
        '  // Define sections and actions',
        '}',
        '```',
        '',
        'Connect the surface to relevant entities and workflows.',
        'Run `prodara validate` after adding.',
      ].join('\n'),
    },
    {
      slug: 'add-policy',
      title: 'Add Policy / Rule',
      description: 'Add a new policy or governance rule to a module',
      category: 'spec-edit',
      instructions: [
        'Add a new policy or rule to an existing module:',
        '',
        '```',
        'policy <name> {',
        '  // Define governance rules and constraints',
        '}',
        '```',
        '',
        'Policies enforce constraints across entities and workflows.',
        'Run `prodara validate` after adding.',
      ].join('\n'),
    },
    {
      slug: 'rename',
      title: 'Rename Node',
      description: 'Rename an entity, workflow, surface, or module',
      category: 'spec-edit',
      instructions: [
        'Rename a node in the product specification:',
        '',
        '1. Find the declaration in the .prd file',
        '2. Update the name',
        '3. Update ALL references to this node across all .prd files',
        '4. Run `prodara validate` to verify no broken references',
        '',
        'Use `prodara graph --format json` to find all references.',
      ].join('\n'),
    },
    {
      slug: 'move',
      title: 'Move Node Between Modules',
      description: 'Move an entity, workflow, or surface to a different module',
      category: 'spec-edit',
      instructions: [
        'Move a node from one module to another:',
        '',
        '1. Cut the node declaration from the source module',
        '2. Paste it into the target module .prd file',
        '3. Update import statements in both modules',
        '4. Run `prodara validate` to verify the move',
        '',
        'Use `prodara graph --format json` to check impact.',
      ].join('\n'),
    },

    // -- Query commands --
    {
      slug: 'explain',
      title: 'Explain Node',
      description: 'Explain any node in the product graph',
      category: 'query',
      instructions: [
        'Explain a node from the product graph:',
        '',
        '```bash',
        'prodara explain <node-id>',
        '```',
        '',
        'Shows: node type, fields, relationships (edges),',
        'containing module, and related governance rules.',
      ].join('\n'),
    },
    {
      slug: 'why',
      title: 'Explain Diagnostic',
      description: 'Explain a compiler diagnostic code',
      category: 'query',
      instructions: [
        'Explain a Prodara diagnostic code:',
        '',
        '```bash',
        'prodara explain --diagnostic <code>',
        '```',
        '',
        'Shows the diagnostic meaning, common causes, and suggested fixes.',
        'Diagnostic codes follow the pattern PRDxxxx.',
      ].join('\n'),
    },
    {
      slug: 'graph',
      title: 'Visualize Product Graph',
      description: 'Output the product graph for visualization',
      category: 'query',
      instructions: [
        'Generate the product graph:',
        '',
        '```bash',
        'prodara graph --format json',
        '```',
        '',
        'The graph includes all nodes (modules, entities, workflows,',
        'surfaces, policies, tests) and their relationships (edges).',
      ].join('\n'),
    },
    {
      slug: 'diff',
      title: 'Show Semantic Diff',
      description: 'Show semantic diff between current and previous build',
      category: 'query',
      instructions: [
        'Show what changed since the last build:',
        '',
        '```bash',
        'prodara diff --semantic',
        '```',
        '',
        'Reports added, modified, and removed nodes with impact analysis.',
      ].join('\n'),
    },
    {
      slug: 'drift',
      title: 'Check Specification Drift',
      description: 'Check for specification drift since the last build',
      category: 'query',
      instructions: [
        'Check if .prd specifications have changed since the last build:',
        '',
        '```bash',
        'prodara drift',
        '```',
        '',
        'If drift is detected:',
        '1. Run `prodara diff --semantic` to see what changed',
        '2. Review the semantic diff for impact on the product graph',
        '3. Run `prodara build` to re-compile with the latest changes',
        '',
        'If no drift is detected, the specification matches the last build.',
      ].join('\n'),
    },
    {
      slug: 'analyze',
      title: 'Analyze Consistency',
      description: 'Run cross-spec consistency analysis via the product graph',
      category: 'query',
      instructions: [
        'Run Prodara to analyze the product graph for consistency:',
        '',
        '```bash',
        'prodara graph --format json',
        '```',
        '',
        'Check for:',
        '1. **Orphan entities** — entities not referenced by any workflow or surface',
        '2. **Missing relationships** — workflows referencing entities from other modules without imports',
        '3. **Test coverage** — entities and workflows without corresponding test blocks',
        '4. **Authorization gaps** — data-modifying workflows without authorization checks',
        '',
        'Report findings and suggest .prd file changes to address issues.',
      ].join('\n'),
    },
    {
      slug: 'checklist',
      title: 'Quality Checklist',
      description: 'Generate a quality checklist from governance rules',
      category: 'query',
      instructions: [
        'Generate a quality validation checklist by analyzing the spec:',
        '',
        '```bash',
        'prodara validate --format json',
        '```',
        '',
        'Then review the product graph for:',
        '- [ ] All entities have an `id` field',
        '- [ ] All workflows have clear step definitions',
        '- [ ] Security-sensitive entities have authorization rules',
        '- [ ] All modules are referenced in the product block',
        '- [ ] Test blocks exist for key entities and workflows',
        '- [ ] Surfaces reference existing entities and workflows',
        '',
        'Format the output as a markdown checklist grouped by category.',
      ].join('\n'),
    },

    // -- Management commands --
    {
      slug: 'help',
      title: 'Interactive Help',
      description: 'Get contextual help based on your project state',
      category: 'management',
      instructions: [
        'Inspect the current project state and provide contextual guidance:',
        '',
        '1. Check which .prd files exist and their contents',
        '2. Check what has been built (look for .prodara/ directory)',
        '3. Suggest next steps based on project completeness',
        '',
        'Common recommendations:',
        '- No .prd files → create a product declaration',
        '- Basic spec → add workflows and surfaces',
        '- Complete spec → run build, review output',
      ].join('\n'),
    },
    {
      slug: 'onboard',
      title: 'Interactive Onboarding',
      description: 'Guided onboarding for new Prodara users',
      category: 'management',
      instructions: [
        'Guide the user through getting started with Prodara:',
        '',
        '1. Check if prodara is installed (`prodara --version`)',
        '2. Check if a product spec exists',
        '3. Walk through creating a basic spec if needed',
        '4. Run first build and explain the output',
        '',
        'Adapt guidance based on the user\'s current project state.',
      ].join('\n'),
    },
    {
      slug: 'extensions',
      title: 'Manage Extensions',
      description: 'Search, install, and manage Prodara extensions',
      category: 'management',
      instructions: [
        'Manage Prodara extensions:',
        '',
        '```bash',
        'prodara extensions list        # List installed',
        'prodara extensions search <q>  # Search npm',
        'prodara extensions add <name>  # Install',
        'prodara extensions remove <name> # Remove',
        '```',
        '',
        'Extensions add custom reviewers, templates, and workflows.',
      ].join('\n'),
    },
    {
      slug: 'presets',
      title: 'Manage Presets',
      description: 'Search, install, and manage configuration presets',
      category: 'management',
      instructions: [
        'Manage Prodara presets:',
        '',
        '```bash',
        'prodara presets list        # List installed',
        'prodara presets search <q>  # Search npm',
        'prodara presets add <name>  # Install',
        'prodara presets remove <name> # Remove',
        '```',
        '',
        'Presets provide pre-configured reviewer, phase, and agent settings.',
      ].join('\n'),
    },
  ];
}

/** Total number of registered slash commands. */
export const SLASH_COMMAND_COUNT = 29;

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export function getAgentConfig(agentId: AgentId): AgentCommandConfig | null {
  /* v8 ignore next -- agentId is always a valid key */
  return AGENT_CONFIGS[agentId] ?? null;
}

export function listSupportedAgents(): readonly AgentId[] {
  return Object.keys(AGENT_CONFIGS) as AgentId[];
}

export function isValidAgentId(value: string): value is AgentId {
  return value in AGENT_CONFIGS;
}

/**
 * Detect which AI agent was used during init by checking for the
 * presence of the main `prodara` command file in each agent's
 * commands directory. Returns the first match, or null if none found.
 */
export function detectAgent(root: string): AgentId | null {
  for (const [id, config] of Object.entries(AGENT_CONFIGS) as [AgentId, AgentCommandConfig][]) {
    if (id === 'generic') continue;
    const mainFile = join(root, config.commandsDir, `prodara${config.commandExtension}`);
    if (existsSync(mainFile)) return id;
  }
  return null;
}

/**
 * Generate slash command files for a given AI agent.
 * Returns file paths (relative to root) and their content.
 */
export function generateSlashCommands(
  agentId: AgentId,
  root: string,
  productName: string,
  customDir?: string,
): SlashCommandFile[] {
  const config = AGENT_CONFIGS[agentId];
  /* v8 ignore next -- config is always found for valid AgentId */
  if (!config) return [];

  const commandsDir = customDir ?? config.commandsDir;
  const commands = getCommandDefs(productName);
  const files: SlashCommandFile[] = [];

  for (const cmd of commands) {
    const fileName = cmd.slug === 'build'
      ? `prodara${config.commandExtension}`
      : `prodara-${cmd.slug}${config.commandExtension}`;
    const filePath = join(root, commandsDir, fileName);
    const content = renderCommandFile(config, cmd);
    files.push({ path: filePath, content });
  }

  return files;
}

/**
 * Write generated slash command files to disk.
 */
export function writeSlashCommands(commands: readonly SlashCommandFile[]): void {
  for (const cmd of commands) {
    mkdirSync(dirname(cmd.path), { recursive: true });
    writeFileSync(cmd.path, cmd.content, 'utf-8');
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderCommandFile(config: AgentCommandConfig, cmd: CommandDef): string {
  const sections: string[] = [];

  // Platform-specific frontmatter
  if (config.frontmatterStyle === 'yaml') {
    sections.push('---');
    if (config.agentId === 'copilot') {
      if (cmd.slug === 'build') {
        sections.push('name: Prodara');
      }
      sections.push(`description: "${cmd.description}"`);
      sections.push('mode: agent');
    }
    if (config.agentId === 'cursor') {
      sections.push(`description: "${cmd.description}"`);
      sections.push('globs: ["**/*.prd"]');
    }
    sections.push('---');
    sections.push('');
  }

  // Command header
  sections.push(`# Prodara: ${cmd.title}`);
  sections.push('');
  sections.push(cmd.description);
  sections.push('');

  // Instructions
  sections.push('## Instructions');
  sections.push('');
  sections.push(cmd.instructions);
  sections.push('');

  // Reference section
  sections.push('## Reference');
  sections.push('');
  sections.push('- Configuration: `prodara.config.json`');
  sections.push('- Specifications: `*.prd` files');
  sections.push('- Build state: `.prodara/` directory');
  sections.push('- Documentation: `docs/` directory (if present)');
  sections.push('');

  return sections.join('\n');
}
