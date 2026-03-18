// ---------------------------------------------------------------------------
// Prodara Compiler — Headless API Client
// ---------------------------------------------------------------------------
// Minimal HTTP client for OpenAI and Anthropic chat completion APIs.
// Uses Node.js built-in fetch (no external dependencies).
// Supports retry with exponential backoff.

import type { AgentDriver, AgentRequest, AgentResponse, AgentMetadata, AgentPlatform } from './types.js';
import type { ApiProvider } from '../config/config.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ApiClientConfig {
  readonly provider: ApiProvider;
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
  readonly maxRetries?: number;
  readonly timeoutMs?: number;
}

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

interface ChatCompletionResult {
  readonly content: string;
  readonly model: string;
  readonly tokens_used: number;
}

// ---------------------------------------------------------------------------
// Provider endpoints
// ---------------------------------------------------------------------------

const DEFAULT_URLS: Record<ApiProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
};

const DEFAULT_MODELS: Record<ApiProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

// ---------------------------------------------------------------------------
// Internal: build request body per provider
// ---------------------------------------------------------------------------

function buildOpenAIBody(messages: readonly ChatMessage[], model: string): string {
  return JSON.stringify({ model, messages, temperature: 0 });
}

function buildAnthropicBody(messages: readonly ChatMessage[], model: string): string {
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  return JSON.stringify({ model, system, messages: userMessages, max_tokens: 4096 });
}

// ---------------------------------------------------------------------------
// Internal: parse response per provider
// ---------------------------------------------------------------------------

function parseOpenAIResponse(data: Record<string, unknown>): ChatCompletionResult {
  const choices = data['choices'] as { message: { content: string } }[] | undefined;
  const content = choices?.[0]?.message?.content ?? '';
  const usage = data['usage'] as { total_tokens?: number } | undefined;
  const model = typeof data['model'] === 'string' ? data['model'] : '';
  return { content, model, tokens_used: usage?.total_tokens ?? 0 };
}

function parseAnthropicResponse(data: Record<string, unknown>): ChatCompletionResult {
  const contentArr = data['content'] as { type: string; text: string }[] | undefined;
  const content = contentArr?.find((c) => c.type === 'text')?.text ?? '';
  const usage = data['usage'] as { input_tokens?: number; output_tokens?: number } | undefined;
  const tokens = (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);
  const model = typeof data['model'] === 'string' ? data['model'] : '';
  return { content, model, tokens_used: tokens };
}

// ---------------------------------------------------------------------------
// Core: send chat completion request with retry
// ---------------------------------------------------------------------------

export async function chatCompletion(
  config: ApiClientConfig,
  messages: readonly ChatMessage[],
): Promise<ChatCompletionResult> {
  const url = config.baseUrl ?? DEFAULT_URLS[config.provider];
  const model = config.model || DEFAULT_MODELS[config.provider];
  const maxRetries = config.maxRetries ?? 3;
  const timeoutMs = config.timeoutMs ?? 60_000;

  const body = config.provider === 'openai'
    ? buildOpenAIBody(messages, model)
    : buildAnthropicBody(messages, model);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.provider === 'openai') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      await sleep(delay);
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = (await response.json()) as Record<string, unknown>;

      return config.provider === 'openai'
        ? parseOpenAIResponse(data)
        : parseAnthropicResponse(data);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxRetries - 1) break;
    }
  }

  throw lastError ?? /* v8 ignore next */ new Error('API request failed');
}

// ---------------------------------------------------------------------------
// ApiDriver — implements AgentDriver for headless/CI use
// ---------------------------------------------------------------------------

export class ApiDriver implements AgentDriver {
  readonly platform: AgentPlatform = 'api';
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async execute(request: AgentRequest): Promise<AgentResponse> {
    const start = Date.now();

    const messages: ChatMessage[] = [];

    // System message: constitution + governance
    const systemParts: string[] = [];
    if (request.context.constitution) {
      systemParts.push(`# Constitution\n\n${request.context.constitution}`);
    }
    if (request.context.governance) {
      systemParts.push(`# Governance\n\n${request.context.governance}`);
    }
    if (systemParts.length > 0) {
      messages.push({ role: 'system', content: systemParts.join('\n\n') });
    }

    // User message: prompt + graph context
    const userParts: string[] = [request.prompt];
    if (request.context.graphSlice) {
      userParts.push(`\n\n# Graph Context\n\n${request.context.graphSlice}`);
    }
    for (const [key, value] of Object.entries(request.context.additionalContext)) {
      userParts.push(`\n\n# ${key}\n\n${value}`);
    }
    messages.push({ role: 'user', content: userParts.join('') });

    try {
      const result = await chatCompletion(this.config, messages);
      const metadata: AgentMetadata = {
        platform: 'api',
        duration_ms: Date.now() - start,
        tokens_used: result.tokens_used,
        model: result.model,
      };
      return { content: result.content, status: 'success', metadata };
    } catch (err) {
      const metadata: AgentMetadata = {
        platform: 'api',
        duration_ms: Date.now() - start,
        tokens_used: null,
        model: null,
      };
      const message = err instanceof Error ? err.message : /* v8 ignore next */ String(err);
      return { content: message, status: 'error', metadata };
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createApiDriver(config: ApiClientConfig): ApiDriver {
  return new ApiDriver(config);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
