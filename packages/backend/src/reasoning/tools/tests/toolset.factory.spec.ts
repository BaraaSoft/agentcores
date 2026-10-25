import { JobPlanningToolset } from '../../job/tools/job-planning-toolset';
import { ToolsetFactory } from '../toolset.factory';

describe('ToolsetFactory', () => {
  it('creates a new Job planning toolset over the remaining plan on every call', () => {
    const factory = new ToolsetFactory();

    const first = factory.createJobPlanningToolset(['Open', 'Reply'], 4);
    const second = factory.createJobPlanningToolset(['Open', 'Reply'], 4);

    expect(first).toBeInstanceOf(JobPlanningToolset);
    expect(first.actions).toEqual(['Open', 'Reply']);
    expect(second).not.toBe(first);
  });
});
