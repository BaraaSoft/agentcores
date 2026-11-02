import type { Strategy } from '../../../api/types/strategy';
import type { WorkflowSummary } from '../../../api/types/workflow-summary';
import type { WorkflowCardData } from '../../../components/workhub-components/workflow-card/workflow-card';
import { workTypeLine } from '../../monitor/model/work-type-line';
import { durationLabel } from './duration-label';

/** A Workflow saved within this long of its creation has never been started. */
const NEVER_STARTED_MS = 1_000;

function timeLine(workflow: WorkflowSummary, now: number): string {
  if (workflow.state === 'running') return `Running for ${durationLabel(workflow.updatedAt, now)}`;
  if (workflow.state === 'done') return `Done ${durationLabel(workflow.updatedAt, now)} ago`;
  if (Date.parse(workflow.updatedAt) - Date.parse(workflow.createdAt) < NEVER_STARTED_MS)
    return `Created ${durationLabel(workflow.createdAt, now)} ago, not started`;
  return `Paused ${durationLabel(workflow.updatedAt, now)} ago`;
}

/** Numbers each Workflow among the runs of its Strategy, oldest first: the first run is 1. */
function runNumbers(workflows: readonly WorkflowSummary[]): Map<string, number> {
  const seen = new Map<string, number>();
  const numbers = new Map<string, number>();
  for (const workflow of [...workflows].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) {
    const next = (seen.get(workflow.strategyId) ?? 0) + 1;
    seen.set(workflow.strategyId, next);
    numbers.set(workflow.id, next);
  }
  return numbers;
}

/** Joins each Workflow to its Strategy, in the words the cards show. The newest comes first, so a pause never moves a card. */
export function presentWorkflowCards(
  workflows: readonly WorkflowSummary[],
  strategies: readonly Strategy[],
  now: number,
): WorkflowCardData[] {
  const strategyById = new Map(strategies.map((strategy) => [strategy.id, strategy]));
  const numbers = runNumbers(workflows);
  return [...workflows]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((workflow) => {
      const strategy = strategyById.get(workflow.strategyId);
      const jobs = workflow.resources.maxConcurrentJobs;
      return {
        id: workflow.id,
        state: workflow.state,
        isFreeingMachine: workflow.state !== 'running' && workflow.activeTaskCount > 0,
        strategyName: strategy?.name ?? 'Unknown strategy',
        runLine: `Run ${numbers.get(workflow.id) ?? 1}`,
        objective: strategy?.objective ?? '',
        workTypeLine: strategy === undefined ? '' : workTypeLine(strategy),
        machineId: workflow.machineId,
        concurrencyLine: `${jobs} Job${jobs === 1 ? '' : 's'} at a time`,
        budgetLine: `$${workflow.resources.budgetLimit.toLocaleString('en-US')} / month`,
        timeLine: timeLine(workflow, now),
      };
    });
}
