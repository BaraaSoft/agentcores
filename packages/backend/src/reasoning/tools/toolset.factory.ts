import { Injectable } from '@nestjs/common';
import { JobPlanningToolset } from '../job/tools/job-planning-toolset';
import type { PlannedTask } from '../job/types/planned-task';

/**
 * Builds the toolsets reasoners hand to the model. A toolset holds state for one run (a draft, say),
 * so every call returns a new one; never share a toolset between runs.
 */
@Injectable()
export class ToolsetFactory {
  /** Job planning tools over a draft of `remainingTasks`, holding at most `maxTasks`. */
  createJobPlanningToolset(remainingTasks: readonly PlannedTask[], maxTasks: number): JobPlanningToolset {
    return new JobPlanningToolset(remainingTasks, maxTasks);
  }
}
