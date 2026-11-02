import type { Strategy } from '../../../api/types/strategy';
import type { WorkflowSummary } from '../../../api/types/workflow-summary';
import type { WorkflowCardData } from '../../../components/workhub-components/workflow-card/workflow-card';
import { workTypeLine } from '../../monitor/model/work-type-line';
import { durationLabel } from './duration-label';

/** A Workflow saved within this long of its creation has never been started. */
const NEVER_STARTED_MS = 1_000;

function timeLine(workflow: WorkflowSummary, now: number): string {
  if (workflow.state === 'running') return `Running for ${durationLabel(workflow.updatedAt, now)}`;
  if (Date.parse(workflow.updatedAt) - Date.parse(workflow.createdAt) < NEVER_STARTED_MS)
    return `Created ${durationLabel(workflow.createdAt, now)} ago, not started`;
  return `Paused ${durationLabel(workflow.updatedAt, now)} ago`;
}

/** Joins each Workflow to its Strategy, in the words the cards show. The newest comes first, so a pause never moves a card. */
export function presentWorkflowCards(
  workflows: readonly WorkflowSummary[],
  strategies: readonly Strategy[],
  now: number,
): WorkflowCardData[] {
  const strategyById = new Map(strategies.map((strategy) => [strategy.id, strategy]));
  return [...workflows]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((workflow) => {
      const strategy = strategyById.get(workflow.strategyId);
      const jobs = workflow.resources.maxConcurrentJobs;
      return {
        id: workflow.id,
        state: workflow.state,
        strategyName: strategy?.name ?? 'Unknown strategy',
        objective: strategy?.objective ?? '',
        workTypeLine: strategy === undefined ? '' : workTypeLine(strategy),
        isStrategyComplete: strategy?.status === 'complete',
        machineId: workflow.machineId,
        concurrencyLine: `${jobs} Job${jobs === 1 ? '' : 's'} at a time`,
        budgetLine: `$${workflow.resources.budgetLimit.toLocaleString('en-US')} / month`,
        timeLine: timeLine(workflow, now),
      };
    });
}
