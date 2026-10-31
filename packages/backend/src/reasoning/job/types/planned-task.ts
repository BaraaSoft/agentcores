import type { TaskSkillType } from '@ahe/agent-core';

/**
 * One Task in a Job's plan, before it runs: the action and the skill it runs with.
 */
export interface PlannedTask {
  readonly action: string;
  readonly skillType: TaskSkillType;
}
