import Anthropic from '@anthropic-ai/sdk';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CompletionInput } from './types/completion-input';

/**
 * Thin wrapper around the Anthropic API for the reasoning model (Opus).
 * Every call is text-in, structured-JSON-out; screenshots never reach this client.
 */
@Injectable()
export class ReasoningModelClient {
  private readonly client: Anthropic;
  private readonly modelId: string;

  constructor(config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY') });
    this.modelId = config.getOrThrow<string>('REASONING_MODEL_ID');
  }

  /**
   * Sends one prompt and parses the reply as JSON of the expected shape.
   * Throws when the reply isn't valid JSON for that shape.
   */
  async completeStructured<TOutput>(input: CompletionInput): Promise<TOutput> {
    throw new NotImplementedException();
  }
}
