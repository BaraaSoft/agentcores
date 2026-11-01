import { TASK_SKILL_TYPES } from '@ahe/agent-core';
import { REQUIRED_TASK_SKILL_SECTIONS } from '../task-skill.constants';
import { GENERAL_SKILL } from '../../specialist/general.skill';
import { CREATIVE_DESIGN_SKILL } from '../../specialist/creative-design.skill';
import { TASK_SKILLS } from '../task-skill-registry';

describe('TASK_SKILLS', () => {
  it('has a skill for every skill type, under its own type', () => {
    for (const skillType of TASK_SKILL_TYPES) expect(TASK_SKILLS[skillType].skillType).toBe(skillType);
  });

  it('gives every skill the required sections', () => {
    for (const skill of Object.values(TASK_SKILLS)) {
      for (const section of REQUIRED_TASK_SKILL_SECTIONS) expect(skill.systemPrompt[section]).toBeDefined();
    }
  });

  it('runs design work in long steps that return the final screen', () => {
    expect(CREATIVE_DESIGN_SKILL.maxExecutionSteps).toBe(150);
    expect(CREATIVE_DESIGN_SKILL.returnsScreenshot).toBe(true);
    expect(CREATIVE_DESIGN_SKILL.systemPrompt.CRAFT).toContain('The style the brief or the owner context names always wins.');
    expect(CREATIVE_DESIGN_SKILL.systemPrompt.CRAFT).toContain('aim for modern, creative,\n  and elegant work');
    expect(CREATIVE_DESIGN_SKILL.systemPrompt.OWNER).toBe(GENERAL_SKILL.systemPrompt.OWNER);
    expect(GENERAL_SKILL.returnsScreenshot).toBe(false);
  });
});
