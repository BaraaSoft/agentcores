import type { StrategyDraft } from './strategy-draft';

/** One message per field that needs fixing. An empty object means the draft can launch. */
export type DraftErrors = Partial<Record<'name' | 'objective' | 'owner' | 'machineId' | 'budgetLimit', string>>;

/** Checks what the backend would reject, and says how to fix it in plain words. */
export function validateDraft(draft: StrategyDraft): DraftErrors {
  const budget = Number(draft.budgetLimit);
  return {
    ...(draft.name.trim() === '' ? { name: 'Give the strategy a short name.' } : {}),
    ...(draft.objective.trim() === '' ? { objective: 'Describe the outcome you want.' } : {}),
    ...(draft.owner.trim() === '' ? { owner: 'Say who your co-worker acts for.' } : {}),
    ...(draft.machineId.trim() === '' ? { machineId: 'Name the machine your co-worker works on.' } : {}),
    ...(draft.budgetLimit.trim() === '' || !Number.isFinite(budget) || budget < 0 ? { budgetLimit: 'Enter an amount of 0 or more.' } : {}),
  };
}
