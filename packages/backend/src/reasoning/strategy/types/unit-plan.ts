import type { PlannedJob } from './planned-job';

/**
 * The planner's answer for a Strategy's next Unit of Work: its Jobs, in order, or — only for a
 * `one_off` Strategy after its first attempt — `done`, because the earlier evaluations show the
 * outcome is met.
 */
export type UnitPlan =
  | { readonly decision: 'plan'; readonly rationale: string; readonly jobs: readonly PlannedJob[] }
  | { readonly decision: 'done'; readonly rationale: string };
