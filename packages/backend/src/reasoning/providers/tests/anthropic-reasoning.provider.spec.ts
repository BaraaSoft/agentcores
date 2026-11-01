import * as z from 'zod/v4';
import type { CompletionInput } from '../../types/completion-input';
import { AnthropicReasoningProvider } from '../anthropic-reasoning.provider';

const call = (extra: Partial<CompletionInput<unknown>> = {}): CompletionInput<unknown> => ({
  systemPrompt: 'You decide.',
  userPrompt: 'Decide.',
  maxTokens: 4000,
  schema: z.object({}),
  ...extra,
});

describe('AnthropicReasoningProvider', () => {
  const provider = AnthropicReasoningProvider.create('test-key');

  it('calls the Anthropic API with the key it is given', () => {
    expect(provider.sdk.apiKey).toBe('test-key');
    expect(provider.sdk.baseURL).toBe('https://api.anthropic.com');
    expect(provider.canFetch).toBe(true);
  });

  it('offers no server tools unless the call asks for one', () => {
    expect(provider.serverTools(call())).toBeUndefined();
  });

  it('caps web search at the number of searches asked for', () => {
    expect(provider.serverTools(call({ webSearch: { maxSearches: 3 } }))).toEqual([
      { type: 'web_search_20260318', name: 'web_search', max_uses: 3 },
    ]);
  });

  it('caps web fetch in count and in size per page', () => {
    expect(provider.serverTools(call({ webFetch: { maxFetches: 2 } }))).toEqual([
      { type: 'web_fetch_20260318', name: 'web_fetch', max_uses: 2, max_content_tokens: expect.any(Number) },
    ]);
  });

  it('offers both web tools when the call allows both, and lets the model choose', () => {
    const tools = provider.serverTools(call({ webSearch: { maxSearches: 3 }, webFetch: { maxFetches: 2 } }));

    expect(tools?.map((tool) => (tool as { name: string }).name)).toEqual(['web_search', 'web_fetch']);
  });
});
