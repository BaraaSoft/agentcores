import type * as z from 'zod/v4';
import type { JOB_REVIEW_SCHEMA } from '../schemas/job-review.schema';

/**
 * Job reasoning's verdict on a finished Task. It judges; it never edits the plan — a `revise` decision
 * hands `revisionNotes` to planning. `summary` becomes the Job's outcome summary if the Job closes.
 */
export type JobReview = Readonly<z.infer<typeof JOB_REVIEW_SCHEMA>>;
