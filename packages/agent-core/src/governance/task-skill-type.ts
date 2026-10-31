/**
 * The kind of work a Task is, chosen by Job reasoning when it plans the Task. Each type has its own
 * skill: the system prompt Task reasoning plans with, how long one execution step may run, and whether
 * the final screen comes back as a screenshot.
 * `general` is the fallback for anything that fits no other type.
 */
export const TASK_SKILL_TYPES = ['general', 'creative_design', 'social_post'] as const;

export type TaskSkillType = (typeof TASK_SKILL_TYPES)[number];
