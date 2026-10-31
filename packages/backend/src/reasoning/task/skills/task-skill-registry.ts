import type { TaskSkillType } from '@ahe/agent-core';
import { CREATIVE_DESIGN_SKILL } from './creative-design.skill';
import { GENERAL_SKILL } from './general.skill';
import { SOCIAL_POST_SKILL } from './social-post.skill';
import type { TaskSkill } from './task-skill';

/**
 * Every skill by its type. Adding a skill type in `@ahe/agent-core` fails the build until it is added here.
 */
export const TASK_SKILLS: Readonly<Record<TaskSkillType, TaskSkill>> = {
  general: GENERAL_SKILL,
  creative_design: CREATIVE_DESIGN_SKILL,
  social_post: SOCIAL_POST_SKILL,
};
