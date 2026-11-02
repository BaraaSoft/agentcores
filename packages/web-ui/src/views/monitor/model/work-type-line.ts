import type { WorkflowProgress } from '../../../api/types/workflow-progress';

/** A short, readable line for the Strategy's work type, such as "one-off · up to 3 iterations". */
export function workTypeLine(strategy: Pick<WorkflowProgress['strategy'], 'workType' | 'versionCount' | 'maxAttempts'>): string {
  if (strategy.workType === 'continuous') return 'continuous';
  if (strategy.workType === 'multi_version') return `multi-version · ${strategy.versionCount ?? '?'} versions`;
  return `one-off · up to ${strategy.maxAttempts} iteration${strategy.maxAttempts === 1 ? '' : 's'}`;
}
