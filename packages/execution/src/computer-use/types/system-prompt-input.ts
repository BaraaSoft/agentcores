/**
 * The per-task values baked into the execution system prompt.
 */
export interface SystemPromptInput {
  /** Today, so the model can judge dates on screen (post ages, expiry notices). */
  readonly date: Date;
  /** The task's step budget, so the model knows when to change approach instead of retrying. */
  readonly maxSteps: number;
}
