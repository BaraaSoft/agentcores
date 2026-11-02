import type { Strategy } from '../../../api/types/strategy';
import type { WorkflowSummary } from '../../../api/types/workflow-summary';
import type { StrategyOption } from '../../../components/workhub-components/strategy-option-list/strategy-option-list';
import { workTypeLine } from '../../monitor/model/work-type-line';

function usageLine(runs: readonly WorkflowSummary[]): string {
  if (runs.length === 0) return 'No run yet';
  const count = `${runs.length} run${runs.length === 1 ? '' : 's'}`;
  if (runs.some((workflow) => workflow.state === 'running')) return `${count} · running now`;
  const latest = runs.reduce((a, b) => (Date.parse(b.createdAt) > Date.parse(a.createdAt) ? b : a));
  return `${count} · last one ${latest.state}`;
}

/** Every Strategy, with how many times it ran and how its latest run stands. Any Strategy can run again. */
export function presentStrategyOptions(strategies: readonly Strategy[], workflows: readonly WorkflowSummary[]): StrategyOption[] {
  return strategies.map((strategy) => {
    const runs = workflows.filter((workflow) => workflow.strategyId === strategy.id);
    return {
      id: strategy.id,
      name: strategy.name,
      workTypeLine: workTypeLine(strategy),
      usageLine: usageLine(runs),
      isRunning: runs.some((workflow) => workflow.state === 'running'),
    };
  });
}
