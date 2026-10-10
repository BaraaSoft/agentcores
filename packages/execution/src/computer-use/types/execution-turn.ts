/**
 * One model turn of a task, as text: what the model said and which tools it called.
 * Screenshots are never included, and the task's secrets are redacted.
 */
export interface ExecutionTurn {
  /** 1-based turn number within the task. */
  readonly turn: number;
  /** All text the model wrote this turn. */
  readonly text: string;
  /** Each tool call as `name {input JSON}`, in order. */
  readonly toolCalls: readonly string[];
}
