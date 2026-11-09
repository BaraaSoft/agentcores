import type { Screenshot } from '@agentcores/agent-core';
import type * as z from 'zod/v4';

/**
 * One request to the reasoning model. The reply must match `schema`; the API enforces it as a JSON
 * schema output format.
 */
export interface CompletionInput<TOutput> {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  /**
   * Images sent before the prompt. Only Job review and the evaluator attach any here (Job planning does in
   * its tool loop): the final screen of a visual Task, so they can see the work. Task reasoning never does.
   */
  readonly images?: readonly Screenshot[];
  /** Covers thinking and the answer together. */
  readonly maxTokens: number;
  readonly schema: z.ZodType<TOutput>;
  /**
   * Lets the model look things up on the web before it answers, at most `maxSearches` times. Left out,
   * the call cannot search at all. Says only that searching is allowed, not how it is done, so a model
   * client for another provider can satisfy it its own way.
   */
  readonly webSearch?: { readonly maxSearches: number };
  /**
   * Lets the model read a web page at a given address before it answers, at most `maxFetches` times. Left out,
   * the call cannot open pages. With `webSearch` too, the model chooses which to use.
   */
  readonly webFetch?: { readonly maxFetches: number };
}
