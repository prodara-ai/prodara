// ---------------------------------------------------------------------------
// Prodara Compiler — Agent Driver
// ---------------------------------------------------------------------------
// Platform-agnostic agent orchestration. Supports prompt-file drivers (IDE)
// and direct API drivers (headless/CI).

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type {
  AgentDriver,
  AgentRequest,
  AgentResponse,
  AgentPlatform,
  AgentContext,
  PromptFileOutput,
  AgentMetadata,
} from './types.js';

// ---------------------------------------------------------------------------
// Prompt File Driver — writes prompt files for IDE-based agents
// ---------------------------------------------------------------------------

const PLATFORM_PATHS: Record<string, string> = {
  copilot: '.github/prompts',
  claude: '.claude/commands',
  cursor: '.cursor/rules',
  opencode: '.opencode/agent',
  codex: '.codex',
};

const PLATFORM_EXTENSIONS: Record<string, string> = {
  copilot: '.prompt.md',
  claude: '.md',
  cursor: '.mdc',
  opencode: '.md',
  codex: '.md',
};

export class PromptFileDriver implements AgentDriver {
  readonly platform: AgentPlatform;
  private readonly root: string;

  constructor(platform: AgentPlatform, root: string) {
    this.platform = platform;
    this.root = root;
  }

  async execute(request: AgentRequest): Promise<AgentResponse> {
    const start = Date.now();
    const output = this.generatePromptFile(request);

    // Write the prompt file
    const dir = dirname(output.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(output.path, output.content, 'utf-8');

    const metadata: AgentMetadata = {
      platform: this.platform,
      duration_ms: Date.now() - start,
      tokens_used: null,
      model: null,
    };

    return {
      content: output.content,
      status: 'success',
      metadata,
    };
  }

  generatePromptFile(request: AgentRequest): PromptFileOutput {
    /* v8 ignore next 2 -- all known platforms are in the maps; fallback is defensive */
    const dirName = PLATFORM_PATHS[this.platform] ?? '.prodara/prompts';
    const ext = PLATFORM_EXTENSIONS[this.platform] ?? '.md';
    const fileName = `prodara-${request.capability}${ext}`;
    const path = join(this.root, dirName, fileName);
    const content = formatPromptForPlatform(this.platform, request);

    return { path, content };
  }
}

// ---------------------------------------------------------------------------
// Prompt formatting
// ---------------------------------------------------------------------------

function formatPromptForPlatform(platform: AgentPlatform, request: AgentRequest): string {
  const sections: string[] = [];

  // Platform-specific frontmatter
  if (platform === 'copilot') {
    sections.push('---');
    sections.push(`mode: ${request.capability}`);
    sections.push('tools: []');
    sections.push('---');
    sections.push('');
  } else if (platform === 'cursor') {
    sections.push('---');
    sections.push(`description: Prodara ${request.capability} phase`);
    sections.push('globs: ["**/*.prd"]');
    sections.push('---');
    sections.push('');
  }

  // Main prompt
  sections.push(request.prompt);

  // Context sections
  if (request.context.constitution) {
    sections.push('');
    sections.push('## Constitution');
    sections.push('');
    sections.push(request.context.constitution);
  }

  if (request.context.graphSlice) {
    sections.push('');
    sections.push('## Graph Context');
    sections.push('');
    sections.push(request.context.graphSlice);
  }

  if (request.context.governance) {
    sections.push('');
    sections.push('## Governance Rules');
    sections.push('');
    sections.push(request.context.governance);
  }

  for (const [key, value] of Object.entries(request.context.additionalContext)) {
    sections.push('');
    sections.push(`## ${key}`);
    sections.push('');
    sections.push(value);
  }

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Driver factory
// ---------------------------------------------------------------------------

export function createDriver(platform: AgentPlatform, root: string): AgentDriver {
  if (platform === 'api') {
    // API driver placeholder — will be implemented in C4
    throw new Error('API driver not yet implemented. Use --headless with a configured API key.');
  }
  return new PromptFileDriver(platform, root);
}
