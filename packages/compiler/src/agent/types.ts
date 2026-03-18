// ---------------------------------------------------------------------------
// Prodara Compiler — Agent Types
// ---------------------------------------------------------------------------

export type AgentPlatform =
  | 'copilot' | 'claude' | 'cursor' | 'opencode' | 'codex'
  | 'gemini' | 'windsurf' | 'kiro' | 'jules' | 'amp' | 'roo'
  | 'aider' | 'cline' | 'continue' | 'zed' | 'bolt' | 'aide'
  | 'trae' | 'augment' | 'sourcegraph' | 'tabnine' | 'supermaven'
  | 'void' | 'pear' | 'double' | 'generic' | 'api';

export type AgentCapability = 'implement' | 'review' | 'clarify' | 'fix';

export type AgentStatus = 'success' | 'error' | 'timeout' | 'skipped';

export interface AgentRequest {
  readonly prompt: string;
  readonly context: AgentContext;
  readonly capability: AgentCapability;
  readonly platform: AgentPlatform;
}

export interface AgentContext {
  readonly constitution: string | null;
  readonly graphSlice: string | null;
  readonly governance: string | null;
  readonly additionalContext: Record<string, string>;
}

export interface AgentResponse {
  readonly content: string;
  readonly status: AgentStatus;
  readonly metadata: AgentMetadata;
}

export interface AgentMetadata {
  readonly platform: AgentPlatform;
  readonly duration_ms: number;
  readonly tokens_used: number | null;
  readonly model: string | null;
}

export interface AgentDriver {
  readonly platform: AgentPlatform;
  execute(request: AgentRequest): Promise<AgentResponse>;
}

export interface PromptFileOutput {
  readonly path: string;
  readonly content: string;
}
