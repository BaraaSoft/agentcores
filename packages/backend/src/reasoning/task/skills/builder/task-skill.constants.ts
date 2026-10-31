import type { TaskSkillSection } from './task-skill-sections';

/** Screen actions one execution step may take, unless the skill sets its own limit. */
export const DEFAULT_MAX_EXECUTION_STEPS = 30;

/** Sections every skill must set; `build()` refuses a skill without them. */
export const REQUIRED_TASK_SKILL_SECTIONS: readonly TaskSkillSection[] = ['SITUATION', 'STEPS', 'DONE', 'OWNER', 'RULES'];
