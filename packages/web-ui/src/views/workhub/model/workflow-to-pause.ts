import type { Strategy } from '../../../api/types/strategy';
import type { WorkflowSummary } from '../../../api/types/workflow-summary';

/** The running Workflow that a start on the machine would pause, with its Strategy's name. */
export interface WorkflowToPause {
  readonly id: string;
  readonly strategyName: string;
}

/** A machine runs one Workflow at a time, so a start pauses the one that runs there now. Null when none runs. */
export function workflowToPause(
  workflows: readonly WorkflowSummary[],
  strategies: readonly Strategy[],
  machineId: string,
  startingId: string | null,
): WorkflowToPause | null {
  const running = workflows.find(
    (workflow) => workflow.state === 'running' && workflow.machineId === machineId && workflow.id !== startingId,
  );
  if (running === undefined) return null;
  const strategyName = strategies.find((strategy) => strategy.id === running.strategyId)?.name ?? 'Another workflow';
  return { id: running.id, strategyName };
}
