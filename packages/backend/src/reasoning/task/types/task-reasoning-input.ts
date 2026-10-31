import type { TaskSkillType } from '@ahe/agent-core';
import type { TaskOutcome } from '../../job/types/task-outcome';
import type { StepRecord } from './step-record';

/**
 * Everything Task-level reasoning reads; every method takes this same shape.
 * `history` ends with the latest executed step, so a blocked step is its last entry.
 */
export interface TaskReasoningInput {
  readonly taskAction: string;
  /** Picks the skill whose system prompt plans each step. */
  readonly skillType: TaskSkillType;
  readonly jobObjective: string;
  readonly safeContext: string;
  /** The Job's Tasks that finished before this one (complete or failed), in order. */
  readonly earlierTasks: readonly TaskOutcome[];
  readonly history: readonly StepRecord[];
  /** Gates this account hit in the last 24 hours, so pacing can back off before a pattern forms. */
  readonly recentChallengeCount: number;
}
