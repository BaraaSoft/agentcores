import type { StrategyLaunchInput } from '../../../state/types/strategy-launch-input';
import type { StrategyDraft } from './strategy-draft';

/** Turns a valid draft into the launch requests. Only the count that fits the work type is sent. */
export function toLaunchInput(draft: StrategyDraft): StrategyLaunchInput {
  return {
    strategy: {
      owner: draft.owner.trim(),
      name: draft.name.trim(),
      objective: draft.objective.trim(),
      workType: draft.workType,
      ...(draft.workType === 'one_off' ? { maxAttempts: draft.maxAttempts } : {}),
      ...(draft.workType === 'multi_version' ? { versionCount: draft.versionCount } : {}),
    },
    machineId: draft.machineId.trim(),
    resources: { maxConcurrentJobs: draft.maxConcurrentJobs, budgetLimit: Number(draft.budgetLimit) },
  };
}
