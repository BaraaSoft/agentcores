import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { CompletionInput } from './types/completion-input';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';

/**
 * Thin wrapper around the Anthropic API for a reasoning model. Every call is text-in,
 * structured-JSON-out, with adaptive thinking; screenshots never reach this client. Strategy and
 * Unit reasoning use it with the default model; levels with their own model get a subclass
 * (`JobReasoningModelClient`, `TaskReasoningModelClient`). `ReasoningModule` builds each one from config.
 */
export class ReasoningModelClient {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly settings: ReasoningModelSettings,
  ) {}

  /**
   * Sends one prompt and returns the reply parsed against `input.schema`. The schema is sent as the
   * output format, so the model can think first and still must answer in that shape. Throws when the
   * reply is cut off, refused, or doesn't match.
   */
  async completeStructured<TOutput>(input: CompletionInput<TOutput>): Promise<TOutput> {
    const message = await this.anthropic.messages.parse({
      model: this.settings.modelId,
      max_tokens: input.maxTokens,
      system: input.systemPrompt,
      messages: [{ role: 'user', content: input.userPrompt }],
      thinking: { type: 'adaptive' },
      output_config: { effort: this.settings.effort, format: zodOutputFormat(input.schema) },
    });
    if (message.stop_reason !== 'end_turn' || message.parsed_output === null) {
      throw new Error(`Reasoning model gave no structured answer (stop reason: ${message.stop_reason ?? 'unknown'})`);
    }
    return message.parsed_output;
  }
}
