import type * as z from 'zod/v4';
import type { JOB_PLAN_SCHEMA } from '../schemas/job-plan.schema';

/**
 * Job reasoning's decision after looking at the Job: the plan for everything not started yet,
 * or that the Job is over.
 * - Objective met → `isObjectiveMet` (the Job closes as `success`).
 * - Decided to stop → `abandonReason` (closes as `abandoned`: a strategic call, not an execution failure).
 * - Otherwise → `remainingActions`: the same list to continue, or an edited one (added, dropped,
 *   reordered, or replaced Tasks). An empty list with no reason means it ran out of ideas (closes as `failed`).
 *
 * `summary` becomes the Job's outcome summary when it closes.
 */
export type JobPlan = Readonly<z.infer<typeof JOB_PLAN_SCHEMA>>;
