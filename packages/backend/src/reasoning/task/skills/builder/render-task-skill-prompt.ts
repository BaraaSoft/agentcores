import type { TaskSkill } from './task-skill';
import { TASK_SKILL_SECTIONS } from './task-skill-sections';

/**
 * Renders a skill's sections as the system prompt text: one `<SECTION>` block each, in the fixed order
 * of `TASK_SKILL_SECTIONS`, leaving out the sections the skill does not set.
 */
export function renderTaskSkillPrompt(skill: TaskSkill): string {
  return TASK_SKILL_SECTIONS.flatMap((section) => {
    const text = skill.systemPrompt[section];
    return text === undefined ? [] : [`<${section}>\n${text}\n</${section}>`];
  }).join('\n\n');
}
