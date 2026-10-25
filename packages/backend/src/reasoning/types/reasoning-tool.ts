import type * as z from 'zod/v4';

/**
 * A tool the reasoning model can call inside a tool loop. The caller owns what it does; the reasoning
 * layer only routes calls to it. `run` returns the text the model reads back, or throws
 * `ReasoningToolError` to tell the model its call was rejected.
 */
export interface ReasoningTool<TInput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<TInput>;
  /** The loop ends once this tool succeeds. Exactly one tool in a loop sets it. */
  readonly endsLoop: boolean;
  run(input: TInput): string;
}
