import type { TaskSkillType } from '@agentcores/agent-core';
import { CREATIVE_DESIGN_SKILL } from '../specialist/creative-design.skill';
import { GENERAL_SKILL } from '../specialist/general.skill';
import { SOCIAL_POST_SKILL } from '../specialist/social-post.skill';
import type { TaskSkill } from './task-skill';

/**
 * Every skill by its type. Adding a skill type in `@agentcores/agent-core` fails the build until it is added here.
 */
export const TASK_SKILLS: Readonly<Record<TaskSkillType, TaskSkill>> = {
  general: GENERAL_SKILL,
  creative_design: CREATIVE_DESIGN_SKILL,
  social_post: SOCIAL_POST_SKILL,
};
