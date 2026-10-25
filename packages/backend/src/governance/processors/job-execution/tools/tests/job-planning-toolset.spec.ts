import { ReasoningToolError } from '../../../../../reasoning/reasoning-tool.error';
import { JobPlanningToolset } from '../job-planning-toolset';

function setup(remaining: string[] = ['Open', 'Reply'], maxTasks = 4) {
  const toolset = new JobPlanningToolset(remaining, maxTasks);
  const call = (name: string, input: object = {}) => {
    const tool = toolset.tools.find((each) => each.name === name)!;
    return tool.run(tool.inputSchema.parse(input));
  };
  return { toolset, call };
}

describe('JobPlanningToolset', () => {
  it('starts from the remaining plan and shows positions', () => {
    const t = setup();

    expect(t.call('view_plan')).toBe('1. Open\n2. Reply');
  });

  it('inserts, appends, rewrites, removes, and moves Tasks in the draft', () => {
    const t = setup();

    t.call('add_task', { action: 'Read the rules', position: 1 });
    t.call('add_task', { action: 'Check replies', position: null });
    t.call('update_task', { position: 3, action: 'Reply to the top thread' });
    t.call('move_task', { from: 4, to: 2 });
    t.call('remove_task', { position: 3 });

    expect(t.toolset.actions).toEqual(['Read the rules', 'Check replies', 'Reply to the top thread']);
  });

  it('marks the plan finished only through finish_plan', () => {
    const t = setup();
    expect(t.toolset.isFinished).toBe(false);

    expect(t.call('finish_plan', { rationale: 'Fits.' })).toBe('Plan saved with 2 Tasks.');
    expect(t.toolset.isFinished).toBe(true);
    expect(t.toolset.tools.filter((tool) => tool.endsLoop).map((tool) => tool.name)).toEqual(['finish_plan']);
  });

  it.each<[string, string, object]>([
    ['a position past the end', 'update_task', { position: 3, action: 'X' }],
    ['position 0', 'remove_task', { position: 0 }],
    ['an empty action', 'add_task', { action: '  ', position: null }],
    ['a move to a position past the end', 'move_task', { from: 1, to: 3 }],
  ])('rejects %s and leaves the draft unchanged', (_label, name, input) => {
    const t = setup();

    expect(() => t.call(name, input)).toThrow(ReasoningToolError);
    expect(t.toolset.actions).toEqual(['Open', 'Reply']);
  });

  it('refuses to grow the plan past its limit', () => {
    const t = setup(['Open'], 2);
    t.call('add_task', { action: 'Reply', position: null });

    expect(() => t.call('add_task', { action: 'More', position: null })).toThrow('The plan is full (2 Tasks).');
  });

  it('refuses to finish a plan that starts over its limit until Tasks are removed', () => {
    const t = setup(['A', 'B', 'C'], 2);

    expect(() => t.call('finish_plan', { rationale: 'Fits.' })).toThrow('remove 1');
    t.call('remove_task', { position: 3 });
    expect(t.call('finish_plan', { rationale: 'Fits.' })).toBe('Plan saved with 2 Tasks.');
  });
});
