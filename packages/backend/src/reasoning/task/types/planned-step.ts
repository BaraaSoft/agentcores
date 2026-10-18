/**
 * The reasoning layer's next move for a Task. The Task processor checks `isTaskDone`, then
 * `needsHumanJudgment`; any other step is sent to the execution layer.
 */
export interface PlannedStep {
  /** Concrete instruction for the execution layer; the question for the owner when `needsHumanJudgment`. */
  readonly instruction: string;
  readonly rationale: string;
  /** Site the step acts on, e.g. `reddit.com`, so the processor can supply that account's login. `null` when none. */
  readonly platform: string | null;
  /** True when the decision is outside the agent's authority (spend, risk, tone). */
  readonly needsHumanJudgment: boolean;
  /** True when the Task is already done and no step is needed. */
  readonly isTaskDone: boolean;
}
