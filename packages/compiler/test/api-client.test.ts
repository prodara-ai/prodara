// ---------------------------------------------------------------------------
// API Client Tests
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatCompletion, ApiDriver, createApiDriver } from '../src/agent/api-client.js';
import type { ApiClientConfig, ChatMessage } from '../src/agent/api-client.js';
import type { AgentRequest, AgentContext } from '../src/agent/types.js';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse(body: unknown): Response {
  return { ok: true, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as Response;
}

function errResponse(status: number, text: string): Response {
  return { ok: false, status, text: () => Promise.resolve(text), json: () => Promise.resolve({}) } as Response;
}

const openaiConfig: ApiClientConfig = {
  provider: 'openai',
  apiKey: 'sk-test',
  model: 'gpt-4o',
  maxRetries: 1,
  timeoutMs: 5000,
};

const anthropicConfig: ApiClientConfig = {
  provider: 'anthropic',
  apiKey: 'sk-ant-test',
  model: 'claude-sonnet-4-20250514',
  maxRetries: 1,
  timeoutMs: 5000,
};

const messages: ChatMessage[] = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello' },
];

// ---------------------------------------------------------------------------
// chatCompletion
// ---------------------------------------------------------------------------

describe('chatCompletion', () => {
  it('sends OpenAI request and parses response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'Hi there!' } }],
      usage: { total_tokens: 42 },
      model: 'gpt-4o-2024-08-06',
    }));

    const result = await chatCompletion(openaiConfig, messages);
    expect(result.content).toBe('Hi there!');
    expect(result.tokens_used).toBe(42);
    expect(result.model).toBe('gpt-4o-2024-08-06');

    // Verify request shape
    const [url, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    expect(url).toContain('openai.com');
    expect(opts.headers).toHaveProperty('Authorization', 'Bearer sk-test');
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body['model']).toBe('gpt-4o');
  });

  it('sends Anthropic request and parses response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      content: [{ type: 'text', text: 'Hello from Claude!' }],
      usage: { input_tokens: 10, output_tokens: 20 },
      model: 'claude-sonnet-4-20250514',
    }));

    const result = await chatCompletion(anthropicConfig, messages);
    expect(result.content).toBe('Hello from Claude!');
    expect(result.tokens_used).toBe(30);
    expect(result.model).toBe('claude-sonnet-4-20250514');

    const [, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('handles empty OpenAI response gracefully', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ choices: [], usage: {} }));
    const result = await chatCompletion(openaiConfig, messages);
    expect(result.content).toBe('');
    expect(result.tokens_used).toBe(0);
  });

  it('handles empty Anthropic response gracefully', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ content: [], usage: {} }));
    const result = await chatCompletion(anthropicConfig, messages);
    expect(result.content).toBe('');
    expect(result.tokens_used).toBe(0);
  });

  it('handles missing fields in response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));
    const result = await chatCompletion(openaiConfig, messages);
    expect(result.content).toBe('');
    expect(result.tokens_used).toBe(0);
    expect(result.model).toBe('');
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(429, 'Rate limited'));
    await expect(chatCompletion(openaiConfig, messages)).rejects.toThrow('API 429');
  });

  it('retries on failure with exponential backoff', async () => {
    const retryConfig: ApiClientConfig = { ...openaiConfig, maxRetries: 3 };
    mockFetch
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(okResponse({
        choices: [{ message: { content: 'ok' } }],
        usage: { total_tokens: 1 },
        model: 'gpt-4o',
      }));

    const result = await chatCompletion(retryConfig, messages);
    expect(result.content).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('throws after all retries exhausted', async () => {
    const retryConfig: ApiClientConfig = { ...openaiConfig, maxRetries: 2 };
    mockFetch
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'));
    await expect(chatCompletion(retryConfig, messages)).rejects.toThrow('fail2');
  });

  it('uses default URL when baseUrl not provided', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'gpt-4o',
    }));
    await chatCompletion(openaiConfig, messages);
    const [url] = mockFetch.mock.calls[0]! as [string];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('uses custom baseUrl when provided', async () => {
    const custom: ApiClientConfig = { ...openaiConfig, baseUrl: 'http://localhost:8080/v1/chat' };
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'local',
    }));
    await chatCompletion(custom, messages);
    const [url] = mockFetch.mock.calls[0]! as [string];
    expect(url).toBe('http://localhost:8080/v1/chat');
  });

  it('uses default model when config model is empty', async () => {
    const noModel: ApiClientConfig = { ...openaiConfig, model: '' };
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'gpt-4o',
    }));
    await chatCompletion(noModel, messages);
    const [, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body['model']).toBe('gpt-4o');
  });

  it('handles Anthropic messages without system role', async () => {
    const userOnly: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
    mockFetch.mockResolvedValueOnce(okResponse({
      content: [{ type: 'text', text: 'Hello!' }],
      usage: { input_tokens: 5, output_tokens: 5 },
      model: 'claude-sonnet-4-20250514',
    }));
    const result = await chatCompletion(anthropicConfig, userOnly);
    expect(result.content).toBe('Hello!');

    const [, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(body['system']).toBe('');
  });

  it('wraps non-Error throws', async () => {
    mockFetch.mockRejectedValueOnce('string error');
    await expect(chatCompletion(openaiConfig, messages)).rejects.toThrow('string error');
  });

  it('uses default maxRetries and timeoutMs when not provided', async () => {
    const minimal: ApiClientConfig = { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' };
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'gpt-4o',
    }));
    const result = await chatCompletion(minimal, messages);
    expect(result.content).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// ApiDriver
// ---------------------------------------------------------------------------

describe('ApiDriver', () => {
  const context: AgentContext = {
    constitution: 'Be helpful.',
    graphSlice: '{ "modules": [] }',
    governance: 'Follow rules.',
    additionalContext: { hints: 'Extra context' },
  };

  const request: AgentRequest = {
    prompt: 'Implement the feature',
    context,
    capability: 'implement',
    platform: 'api',
  };

  it('executes request and returns success response', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'Generated code here' } }],
      usage: { total_tokens: 100 },
      model: 'gpt-4o',
    }));

    const driver = createApiDriver(openaiConfig);
    expect(driver.platform).toBe('api');
    const response = await driver.execute(request);
    expect(response.status).toBe('success');
    expect(response.content).toBe('Generated code here');
    expect(response.metadata.tokens_used).toBe(100);
    expect(response.metadata.model).toBe('gpt-4o');
    expect(response.metadata.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('constructs system message from constitution and governance', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'gpt-4o',
    }));

    const driver = new ApiDriver(openaiConfig);
    await driver.execute(request);

    const [, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { messages: ChatMessage[] };
    const systemMsg = body.messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('Constitution');
    expect(systemMsg?.content).toContain('Be helpful');
    expect(systemMsg?.content).toContain('Governance');
    expect(systemMsg?.content).toContain('Follow rules');
  });

  it('includes graph slice and additional context in user message', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'gpt-4o',
    }));

    const driver = new ApiDriver(openaiConfig);
    await driver.execute(request);

    const [, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { messages: ChatMessage[] };
    const userMsg = body.messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('Implement the feature');
    expect(userMsg?.content).toContain('Graph Context');
    expect(userMsg?.content).toContain('Extra context');
  });

  it('returns error status on API failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));

    const driver = new ApiDriver(openaiConfig);
    const response = await driver.execute(request);
    expect(response.status).toBe('error');
    expect(response.content).toContain('connection refused');
    expect(response.metadata.tokens_used).toBeNull();
    expect(response.metadata.model).toBeNull();
  });

  it('handles request without constitution or governance', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: { total_tokens: 1 },
      model: 'gpt-4o',
    }));

    const noContext: AgentRequest = {
      prompt: 'Do something',
      context: { constitution: null, graphSlice: null, governance: null, additionalContext: {} },
      capability: 'implement',
      platform: 'api',
    };

    const driver = new ApiDriver(openaiConfig);
    const response = await driver.execute(noContext);
    expect(response.status).toBe('success');

    // No system message should be present
    const [, opts] = mockFetch.mock.calls[0]! as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { messages: ChatMessage[] };
    expect(body.messages.every((m) => m.role !== 'system')).toBe(true);
  });

  it('returns error with stringified non-Error throws', async () => {
    mockFetch.mockImplementationOnce(() => { throw 'raw string failure'; });

    const driver = new ApiDriver(openaiConfig);
    const response = await driver.execute(request);
    expect(response.status).toBe('error');
    expect(response.content).toContain('raw string failure');
  });
});
