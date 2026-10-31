import { JobPlanningToolset } from '../../job/tools/job-planning-toolset';
import type { PlannedTask } from '../../job/types/planned-task';
import { ToolsetFactory } from '../toolset.factory';

const PLAN: PlannedTask[] = [
  { action: 'Open', skillType: 'general' },
  { action: 'Reply', skillType: 'social_post' },
];

describe('ToolsetFactory', () => {
  it('creates a new Job planning toolset over the remaining plan on every call', () => {
    const factory = new ToolsetFactory();

    const first = factory.createJobPlanningToolset(PLAN, 4);
    const second = factory.createJobPlanningToolset(PLAN, 4);

    expect(first).toBeInstanceOf(JobPlanningToolset);
    expect(first.tasks).toEqual(PLAN);
    expect(second).not.toBe(first);
  });
});
