import type Anthropic from '@anthropic-ai/sdk';
import { NotImplementedException } from '@nestjs/common';
import type { CompletionInput } from './types/completion-input';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';

/**
 * Thin wrapper around the Anthropic API for a reasoning model. Every call is text-in,
 * structured-JSON-out; screenshots never reach this client. Strategy and Unit reasoning use it
 * with the default model; levels with their own model get a subclass (`JobReasoningModelClient`,
 * `TaskReasoningModelClient`). `ReasoningModule` builds each one from config.
 */
export class ReasoningModelClient {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly settings: ReasoningModelSettings,
  ) {}

  /**
   * Sends one prompt and parses the reply as JSON of the expected shape.
   * Throws when the reply isn't valid JSON for that shape.
   */
  async completeStructured<TOutput>(input: CompletionInput): Promise<TOutput> {
    throw new NotImplementedException();
  }
}
