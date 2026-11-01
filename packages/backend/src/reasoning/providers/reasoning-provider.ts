import type Anthropic from '@anthropic-ai/sdk';
import type { ToolUnion } from '@anthropic-ai/sdk/resources/messages';
import type * as z from 'zod/v4';
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
  /**
   * The JSON schema this vendor constrains an answer or a tool's input to, built from the zod schema the
   * client checks it against.
   */
  outputSchema(schema: z.ZodType): Record<string, unknown>;
}
