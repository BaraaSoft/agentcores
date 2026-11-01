import type Anthropic from '@anthropic-ai/sdk';
import type { ToolUnion } from '@anthropic-ai/sdk/resources/messages';
import type { CompletionInput } from '../types/completion-input';

/**
 * One vendor behind the reasoning models. Every provider speaks the Anthropic Messages API, so the model
 * clients send the same calls to each; a provider owns only what differs between vendors.
 */
export interface ReasoningProvider {
  /** The SDK instance, pointed at this vendor's endpoint and key. */
  readonly sdk: Anthropic;
  /** Whether the vendor can read a page at an address (web fetch); prompts that ask for it adapt to this. */
  readonly canFetch: boolean;
  /**
   * The tools this vendor runs itself during the call (web search, web fetch, ...), as far as it offers what
   * the call allows; undefined when the call allows none.
   */
  serverTools(input: CompletionInput<unknown>): ToolUnion[] | undefined;
}
