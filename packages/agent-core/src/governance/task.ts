import type { TaskResult } from './task-result';
import type { TaskSkillType } from './task-skill-type';
import type { TaskStatus } from './task-status';

/**
 * An atomic action executed by the execution layer via computer use,
 * e.g. "Post this content to X" or "Check engagement on yesterday's post".
 */
export interface Task {
  readonly id: string;
  readonly jobId: string;
  readonly action: string;
  /** The kind of work, which picks the skill Task reasoning plans with. */
  readonly skillType: TaskSkillType;
  readonly status: TaskStatus;
  readonly result: TaskResult | null;
  /** Where the Task was performed, as the execution layer reported it; set when the Task completes. */
  readonly locationPath: string | null;
  /** Brief steps to reach that place in software; `null` for web pages and files. */
  readonly locationDetails: string | null;
}
