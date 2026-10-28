import type { TaskOutcome } from '../../reasoning/job/types/task-outcome';
import type { TaskEntity } from '../entities/task.entity';

/**
 * The view of a finished Task that the reasoning layer is allowed to see: what was asked, how it
 * ended, and where the work landed — never the individual steps that got there.
 */
export function toTaskOutcome(task: TaskEntity): TaskOutcome {
  return {
    action: task.action,
    status: task.status,
    result: task.result,
    failureReason: task.failureReason,
    locationPath: task.locationPath,
    locationDetails: task.locationDetails,
  };
}
