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
}
