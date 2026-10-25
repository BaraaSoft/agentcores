import { Injectable } from '@nestjs/common';
import { JobPlanningToolset } from '../job/tools/job-planning-toolset';

/**
 * Builds the toolsets reasoners hand to the model. A toolset holds state for one run (a draft, say),
 * so every call returns a new one; never share a toolset between runs.
 */
@Injectable()
export class ToolsetFactory {
  /** Job planning tools over a draft of `remainingActions`, holding at most `maxTasks`. */
  createJobPlanningToolset(remainingActions: readonly string[], maxTasks: number): JobPlanningToolset {
    return new JobPlanningToolset(remainingActions, maxTasks);
  }
}
