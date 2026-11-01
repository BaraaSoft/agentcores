import Anthropic from '@anthropic-ai/sdk';
import type { ToolUnion } from '@anthropic-ai/sdk/resources/messages';
import type { CompletionInput } from '../types/completion-input';
import type { ReasoningProvider } from './reasoning-provider';

/** Meta's Anthropic-compatible endpoint; the SDK appends `/v1/messages`. */
const MUSE_BASE_URL = 'https://api.meta.ai';

/**
 * Muse, on Meta's Model API. It offers web search only: Meta has no web fetch tool, and the search tool takes
 * no limit, so the prompt alone caps how often the model searches.
 */
export class MuseReasoningProvider implements ReasoningProvider {
  readonly canFetch = false;

  constructor(readonly sdk: Anthropic) {}

  /**
   * Builds the provider with its own SDK instance for the Meta API key. `apiKey: null` stops the SDK from
   * also sending `ANTHROPIC_API_KEY` from the environment to Meta.
   */
  static create(apiKey: string): MuseReasoningProvider {
    return new MuseReasoningProvider(new Anthropic({ baseURL: MUSE_BASE_URL, authToken: apiKey, apiKey: null }));
  }

  serverTools(input: CompletionInput<unknown>): ToolUnion[] | undefined {
    if (input.webSearch === undefined) return undefined;
    // Meta takes the unversioned type and rejects `max_uses` with HTTP 400; the SDK types know only versioned ones.
    return [{ type: 'web_search', name: 'web_search' } as unknown as ToolUnion];
  }
}
