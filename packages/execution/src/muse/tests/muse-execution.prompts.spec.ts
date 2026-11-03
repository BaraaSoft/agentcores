import { buildSystemPrompt } from '../../computer-use/execution.prompts';
import { buildMuseSystemPrompt } from '../muse-execution.prompts';

const INPUT = { date: new Date('2026-11-03T00:00:00Z'), maxSteps: 40 };

describe('buildMuseSystemPrompt', () => {
  it('puts the screen and pace rules before the shared prompt', () => {
    const prompt = buildMuseSystemPrompt({ ...INPUT, screenshotSize: { width: 1280, height: 800 } });

    expect(prompt.indexOf('<SCREEN>')).toBeLessThan(prompt.indexOf('<PACE>'));
    expect(prompt.endsWith(buildSystemPrompt(INPUT))).toBe(true);
  });

  it('asks Muse to group its actions and end each group with a screenshot in the same turn', () => {
    const prompt = buildMuseSystemPrompt({ ...INPUT, screenshotSize: { width: 1280, height: 800 } });

    expect(prompt).toContain('end the group with a screenshot call in the same turn');
    expect(prompt).toContain('Never send one action alone and the screenshot in the next turn');
  });
});
