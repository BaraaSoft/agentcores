/**
 * A tool call the tool refused (bad position, over a limit, …). The message goes back to the model as
 * an error result so it can correct itself; it does not stop the loop.
 */
export class ReasoningToolError extends Error {
  override readonly name = 'ReasoningToolError';
}
