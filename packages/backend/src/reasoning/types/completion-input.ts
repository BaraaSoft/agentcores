/**
 * One request to the reasoning model. Prompts carry text only — never screenshots.
 */
export interface CompletionInput {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly maxTokens: number;
}
