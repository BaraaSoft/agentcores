import type { ExecutionTask } from '@agentcores/agent-core';
import { buildTaskPrompt } from '../execution.prompts';

const TASK: ExecutionTask = {
  taskId: 't1',
  instruction: 'Draw the Direction 1 mark.',
  context: 'Voice: calm.',
  maxSteps: 30,
  credentials: null,
};

describe('buildTaskPrompt', () => {
  it('puts the scope after the instruction: the Task, the later Tasks, and the rule to leave their work alone', () => {
    const prompt = buildTaskPrompt({
      ...TASK,
      scope: { taskAction: 'Design Direction 1 in Figma', laterTasks: ['Design Direction 2', 'Write the recommendation'] },
    });

    expect(prompt.indexOf('<instruction>')).toBeLessThan(prompt.indexOf('<scope>'));
    expect(prompt.indexOf('</scope>')).toBeLessThan(prompt.indexOf('<context>'));
    expect(prompt).toContain('This instruction is one step of the Task: Design Direction 1 in Figma');
    expect(prompt).toContain('Left for later Tasks. Do not start them:\n1. Design Direction 2\n2. Write the recommendation');
    expect(prompt).toContain('Do only what the instruction asks.');
  });

  it('says there are no later Tasks for the last Task', () => {
    const prompt = buildTaskPrompt({ ...TASK, scope: { taskAction: 'Export the files', laterTasks: [] } });

    expect(prompt).toContain('Left for later Tasks. Do not start them:\nNone.');
  });

  it('leaves the scope out when the caller has no Task around the instruction', () => {
    const prompt = buildTaskPrompt(TASK);

    expect(prompt).not.toContain('<scope>');
    expect(prompt).toBe('<instruction>\nDraw the Direction 1 mark.\n</instruction>\n\n<context>\nVoice: calm.\n</context>');
  });
});
