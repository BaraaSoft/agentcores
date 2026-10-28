import type * as z from 'zod/v4';

/**
 * One request to the reasoning model. Prompts carry text only — never screenshots. The reply must
 * match `schema`; the API enforces it as a JSON schema output format.
 */
export interface CompletionInput<TOutput> {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  /** Covers thinking and the answer together. */
  readonly maxTokens: number;
  readonly schema: z.ZodType<TOutput>;
  /**
   * Lets the model look things up on the web before it answers, at most `maxSearches` times. Left out,
   * the call cannot search at all. Says only that searching is allowed, not how it is done, so a model
   * client for another provider can satisfy it its own way.
   */
  readonly webSearch?: { readonly maxSearches: number };
}
