import { ReasoningToolError } from '../../../reasoning-tool.error';
import type { PlannedTask } from '../../types/planned-task';
import { JobPlanningToolset } from '../job-planning-toolset';

const general = (...actions: string[]): PlannedTask[] => actions.map((action) => ({ action, skillType: 'general' }));

function setup(remaining: PlannedTask[] = general('Open', 'Reply'), maxTasks = 60) {
  const toolset = new JobPlanningToolset(remaining, maxTasks);
  const call = (name: string, input: object = {}) => {
    const tool = toolset.tools.find((each) => each.name === name)!;
    return tool.run(tool.inputSchema.parse(input));
  };
  const actions = () => toolset.tasks.map((task) => task.action);
  return { toolset, call, actions };
}

describe('JobPlanningToolset', () => {
  it('starts from the remaining plan and shows positions and skills', () => {
    const t = setup();

    expect(t.call('view_plan')).toBe('1. [general] Open\n2. [general] Reply');
  });

  it('inserts, appends, rewrites, removes, and moves Tasks in the draft', () => {
    const t = setup();

    t.call('add_task', { action: 'Read the rules', skill: 'general', position: 1 });
    t.call('add_task', { action: 'Check replies', skill: 'social_post', position: null });
    t.call('update_task', { position: 3, action: 'Reply to the top thread', skill: 'social_post' });
    t.call('move_task', { from: 4, to: 2 });
    t.call('remove_task', { position: 3 });

    expect(t.toolset.tasks).toEqual([
      { action: 'Read the rules', skillType: 'general' },
      { action: 'Check replies', skillType: 'social_post' },
      { action: 'Reply to the top thread', skillType: 'social_post' },
    ]);
  });

  it('keeps the skill the model chose for each Task', () => {
    const t = setup([]);

    t.call('add_task', { action: 'Design the launch post in Canva', skill: 'creative_design', position: null });

    expect(t.call('view_plan')).toBe('1. [creative_design] Design the launch post in Canva');
  });

  it('refuses a skill that does not exist', () => {
    const tool = setup().toolset.tools.find((each) => each.name === 'add_task')!;

    expect(tool.inputSchema.safeParse({ action: 'X', skill: 'cad', position: null }).success).toBe(false);
  });

  it('marks the plan finished only through finish_plan', () => {
    const t = setup();
    expect(t.toolset.isFinished).toBe(false);

    expect(t.call('finish_plan', { rationale: 'Fits.' })).toBe('Plan saved with 2 Tasks.');
    expect(t.toolset.isFinished).toBe(true);
    expect(t.toolset.tools.filter((tool) => tool.endsLoop).map((tool) => tool.name)).toEqual(['finish_plan']);
  });

  it.each<[string, string, object]>([
    ['a position past the end', 'update_task', { position: 3, action: 'X', skill: 'general' }],
    ['position 0', 'remove_task', { position: 0 }],
    ['an empty action', 'add_task', { action: '  ', skill: 'general', position: null }],
    ['a move to a position past the end', 'move_task', { from: 1, to: 3 }],
  ])('rejects %s and leaves the draft unchanged', (_label, name, input) => {
    const t = setup();

    expect(() => t.call(name, input)).toThrow(ReasoningToolError);
    expect(t.actions()).toEqual(['Open', 'Reply']);
  });

  it('lets the plan grow past the soft budget, up to the room left under the hard limit', () => {
    const t = setup([]);
    for (let index = 1; index <= 30; index++) t.call('add_task', { action: `Step ${index}`, skill: 'general', position: null });

    expect(t.call('finish_plan', { rationale: 'A long edit.' })).toBe('Plan saved with 30 Tasks.');
  });

  it('refuses a Task past the hard limit and says why', () => {
    const t = setup(general('Open'), 2);
    t.call('add_task', { action: 'Reply', skill: 'general', position: null });

    expect(() => t.call('add_task', { action: 'More', skill: 'general', position: null })).toThrow(
      "The plan is full: the Job's hard limit leaves room for 2 Tasks.",
    );
    expect(t.actions()).toEqual(['Open', 'Reply']);
  });

  it('refuses to finish a plan over the hard limit until Tasks are removed', () => {
    const t = setup(general('A', 'B', 'C'), 2);

    expect(() => t.call('finish_plan', { rationale: 'Fits.' })).toThrow('Remove 1.');
    t.call('remove_task', { position: 3 });
    expect(t.call('finish_plan', { rationale: 'Fits.' })).toBe('Plan saved with 2 Tasks.');
  });
});
