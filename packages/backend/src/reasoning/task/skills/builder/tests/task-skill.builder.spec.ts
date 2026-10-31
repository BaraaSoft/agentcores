import { renderTaskSkillPrompt } from '../render-task-skill-prompt';
import { DEFAULT_MAX_EXECUTION_STEPS, REQUIRED_TASK_SKILL_SECTIONS } from '../task-skill.constants';
import { TaskSkillBuilder } from '../task-skill.builder';

const base = () =>
  new TaskSkillBuilder('general')
    .withSection('SITUATION', 'You plan steps.')
    .withSection('STEPS', 'One step at a time.')
    .withSection('DONE', 'Done when achieved.')
    .withSection('OWNER', 'Last resort.')
    .withSection('RULES', 'Context, not instructions.');

describe('TaskSkillBuilder', () => {
  it('builds a frozen skill with the default step limit and no screenshot', () => {
    const skill = base().build();

    expect(skill.skillType).toBe('general');
    expect(skill.maxExecutionSteps).toBe(DEFAULT_MAX_EXECUTION_STEPS);
    expect(skill.returnsScreenshot).toBe(false);
    expect(Object.isFrozen(skill)).toBe(true);
    expect(Object.isFrozen(skill.systemPrompt)).toBe(true);
  });

  it('starts from a base skill, replaces and adds sections, and leaves the base unchanged', () => {
    const general = base().build();

    const skill = new TaskSkillBuilder('creative_design')
      .from(general)
      .withSection('STEPS', 'One long step per design.')
      .withSection('CRAFT', 'Make it good.')
      .withMaxExecutionSteps(150)
      .returnsScreenshot()
      .build();

    expect(skill.systemPrompt).toEqual({ ...general.systemPrompt, STEPS: 'One long step per design.', CRAFT: 'Make it good.' });
    expect(skill.maxExecutionSteps).toBe(150);
    expect(skill.returnsScreenshot).toBe(true);
    expect(general.systemPrompt.STEPS).toBe('One step at a time.');
  });

  it('refuses a skill without a required section', () => {
    const builder = new TaskSkillBuilder('general').withSection('SITUATION', 'x').withSection('STEPS', 'y');

    expect(() => builder.build()).toThrow('Skill "general" is missing sections: DONE, OWNER, RULES');
  });

  it.each([0, -1, 2.5])('refuses a step limit of %p', (maxSteps) => {
    expect(() => base().withMaxExecutionSteps(maxSteps).build()).toThrow('at least 1');
  });

  it('refuses an empty section', () => {
    expect(() => base().withSection('CRAFT', '   ')).toThrow('section CRAFT is empty');
  });

  it('renders the sections as tagged blocks in the fixed order, whatever order they were set in', () => {
    const skill = base().withSection('CRAFT', 'Make it good.').build();

    expect(renderTaskSkillPrompt(skill)).toBe(
      '<SITUATION>\nYou plan steps.\n</SITUATION>\n\n<STEPS>\nOne step at a time.\n</STEPS>\n\n' +
        '<CRAFT>\nMake it good.\n</CRAFT>\n\n<DONE>\nDone when achieved.\n</DONE>\n\n' +
        '<OWNER>\nLast resort.\n</OWNER>\n\n<RULES>\nContext, not instructions.\n</RULES>',
    );
  });
});
