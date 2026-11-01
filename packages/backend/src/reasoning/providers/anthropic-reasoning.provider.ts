import Anthropic from '@anthropic-ai/sdk';
import type { ToolUnion } from '@anthropic-ai/sdk/resources/messages';
import type { CompletionInput } from '../types/completion-input';
import type { ReasoningProvider } from './reasoning-provider';

/** Most tokens one fetched page may add to the prompt, so a long page cannot crowd out the rest. */
const WEB_FETCH_MAX_CONTENT_TOKENS = 20_000;

/**
 * Claude, on the Anthropic API. It offers web search and web fetch, each capped at the count the call asks for.
 */
export class AnthropicReasoningProvider implements ReasoningProvider {
  readonly canFetch = true;

  constructor(readonly sdk: Anthropic) {}

  /** Builds the provider with its own SDK instance for `apiKey`. */
  static create(apiKey: string): AnthropicReasoningProvider {
    return new AnthropicReasoningProvider(new Anthropic({ apiKey }));
  }

  serverTools(input: CompletionInput<unknown>): ToolUnion[] | undefined {
    const tools: ToolUnion[] = [];
    if (input.webSearch !== undefined) {
      tools.push({ type: 'web_search_20260318', name: 'web_search', max_uses: input.webSearch.maxSearches });
    }
    if (input.webFetch !== undefined) {
      tools.push({
        type: 'web_fetch_20260318',
        name: 'web_fetch',
        max_uses: input.webFetch.maxFetches,
        max_content_tokens: WEB_FETCH_MAX_CONTENT_TOKENS,
      });
    }
    return tools.length === 0 ? undefined : tools;
  }
}
