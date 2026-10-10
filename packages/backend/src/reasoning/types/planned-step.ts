/**
 * The reasoning layer's next move for a Task. The router reads these flags
 * to decide who handles it.
 */
export interface PlannedStep {
  /** Concrete instruction for the execution layer (or a note to self when strategic). */
  readonly instruction: string;
  readonly rationale: string;
  /** True when the step needs on-screen work (clicking, typing, reading the screen). */
  readonly requiresScreen: boolean;
  /** Site the step acts on, e.g. `reddit.com`, so the harness can supply that account's login. `null` when none. */
  readonly platform: string | null;
  /** True when the decision is outside the agent's authority (spend, risk, tone). */
  readonly needsHumanJudgment: boolean;
  /** True when the Task is already done and no step is needed. */
  readonly isTaskDone: boolean;
}
