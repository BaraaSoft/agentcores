/**
 * The named sections of a skill's system prompt, in the order they are rendered. Each renders as a
 * `<SECTION>` block. A skill sets some or all of them; `REQUIRED_TASK_SKILL_SECTIONS` must always be set.
 */
export const TASK_SKILL_SECTIONS = ['SITUATION', 'STEPS', 'CRAFT', 'DONE', 'OWNER', 'PLATFORM', 'PACING', 'RULES'] as const;

export type TaskSkillSection = (typeof TASK_SKILL_SECTIONS)[number];
