import * as z from 'zod/v4';
import type { CompletionInput } from '../../types/completion-input';
import { MuseReasoningProvider } from '../muse-reasoning.provider';

const call = (extra: Partial<CompletionInput<unknown>> = {}): CompletionInput<unknown> => ({
  systemPrompt: 'You decide.',
  userPrompt: 'Decide.',
  maxTokens: 4000,
  schema: z.object({}),
  ...extra,
});

describe('MuseReasoningProvider', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("calls Meta's Messages endpoint with the Meta API key as a bearer token, and never the Anthropic key", () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';

    const provider = MuseReasoningProvider.create('model-key');

    expect(provider.sdk.baseURL).toBe('https://api.meta.ai');
    expect(provider.sdk.authToken).toBe('model-key');
    expect(provider.sdk.apiKey).toBeNull();
  });

  it('offers no server tools unless the call asks for search', () => {
    const provider = MuseReasoningProvider.create('model-key');

    expect(provider.serverTools(call())).toBeUndefined();
    expect(provider.serverTools(call({ webFetch: { maxFetches: 2 } }))).toBeUndefined();
  });

  it('keeps enum values in the JSON schema, so Meta constrains the answer to them', () => {
    const provider = MuseReasoningProvider.create('model-key');

    const schema = provider.outputSchema(z.object({ verdict: z.enum(['scored', 'needs_evidence']).describe('The verdict.') }));

    expect(schema).not.toHaveProperty('$schema');
    expect(schema).toEqual(
      expect.objectContaining({
        additionalProperties: false,
        required: ['verdict'],
        properties: { verdict: { type: 'string', enum: ['scored', 'needs_evidence'], description: 'The verdict.' } },
      }),
    );
  });

  it('offers web search without a limit, and drops web fetch, which Meta does not have', () => {
    const provider = MuseReasoningProvider.create('model-key');

    expect(provider.canFetch).toBe(false);
    expect(provider.serverTools(call({ webSearch: { maxSearches: 3 }, webFetch: { maxFetches: 2 } }))).toEqual([
      { type: 'web_search', name: 'web_search' },
    ]);
  });
});
