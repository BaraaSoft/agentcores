import type { Strategy } from '../../../api/types/strategy';
import type { WorkflowSummary } from '../../../api/types/workflow-summary';
import type { StrategyOption } from '../../../components/workhub-components/strategy-option-list/strategy-option-list';
import { workTypeLine } from '../../monitor/model/work-type-line';

function usageLine(own: readonly WorkflowSummary[]): string {
  if (own.length === 0) return 'No workflow yet';
  const running = own.filter((workflow) => workflow.state === 'running');
  if (running.length > 0) return `Running on ${running.map((workflow) => workflow.machineId).join(', ')}`;
  return `${own.length} paused`;
}

/** The Strategies a new Workflow can run, with where each one runs already. Complete Strategies are left out. */
export function presentStrategyOptions(strategies: readonly Strategy[], workflows: readonly WorkflowSummary[]): StrategyOption[] {
  return strategies
    .filter((strategy) => strategy.status === 'active')
    .map((strategy) => {
      const own = workflows.filter((workflow) => workflow.strategyId === strategy.id);
      return {
        id: strategy.id,
        name: strategy.name,
        workTypeLine: workTypeLine(strategy),
        usageLine: usageLine(own),
        isRunning: own.some((workflow) => workflow.state === 'running'),
      };
    });
}
