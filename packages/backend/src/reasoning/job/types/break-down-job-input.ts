/**
 * A Job to split into ordered atomic Tasks.
 */
export interface BreakDownJobInput {
  readonly jobName: string;
  readonly objective: string;
  readonly unitName: string;
  readonly safeContext: string;
}
