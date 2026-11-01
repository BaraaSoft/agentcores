import type { Screenshot } from '@ahe/agent-core';
import type { ReasoningTool } from './reasoning-tool';

/**
 * One tool loop: the model thinks, calls tools, reads their results, and repeats until it calls the
 * tool that ends the loop.
 */
export interface ToolLoopInput {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  /** Images sent before the prompt in the first message; they stay in the history for every turn. */
  readonly images?: readonly Screenshot[];
  /** Per model turn, thinking included. */
  readonly maxTokens: number;
  /** Model turns allowed before the loop gives up. */
  readonly maxTurns: number;
  readonly tools: readonly ReasoningTool[];
}
