import type { TaskEntity } from '../../governance/entities/task.entity';
import type { SafeContext } from '../../memory/types/safe-context';

/**
 * Everything the harness holds while running one Task: the Task with its lineage
 * (Job → Unit → Strategy), who it acts for, and privacy-filtered memory.
 */
export interface TaskContext {
  readonly task: TaskEntity;
  readonly owner: string;
  readonly safeContext: SafeContext;
}
