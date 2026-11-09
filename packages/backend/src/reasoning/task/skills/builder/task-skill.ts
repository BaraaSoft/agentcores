import type { TaskSkillType } from '@agentcores/agent-core';
import type { TaskSkillSection } from './task-skill-sections';

/**
 * How Task reasoning works on one kind of Task. Built with `TaskSkillBuilder`, and frozen.
 */
export interface TaskSkill {
  readonly skillType: TaskSkillType;
  /** The system prompt for planning each step, as named sections; `renderTaskSkillPrompt` turns it into text. */
  readonly systemPrompt: Readonly<Partial<Record<TaskSkillSection, string>>>;
  /** Screen actions one execution step may take before the agent gives up. */
  readonly maxExecutionSteps: number;
  /** Whether each step returns the final screen, so Job review and the evaluator can see the work. */
  readonly returnsScreenshot: boolean;
}
