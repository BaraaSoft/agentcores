import type { StrategyWorkType } from '../../../api/types/strategy-work-type';

/** The form as the owner fills it in. Numbers stay numbers; text fields keep what was typed. */
export interface StrategyDraft {
  readonly name: string;
  readonly objective: string;
  readonly workType: StrategyWorkType;
  readonly maxAttempts: number;
  readonly versionCount: number;
  readonly owner: string;
  readonly machineId: string;
  readonly maxConcurrentJobs: number;
  readonly budgetLimit: string;
}

/** The backend's limits for each field, so the form stops at the same place the API would. */
export const DRAFT_LIMITS = {
  nameLength: 200,
  objectiveLength: 5_000,
  ownerLength: 100,
  machineIdLength: 100,
  attempts: { min: 1, max: 10 },
  versions: { min: 1, max: 10 },
  concurrentJobs: { min: 1, max: 10 },
} as const;

/** The one machine the co-worker works on. Every Strategy and Workflow runs here for now. */
export const AHE_MACHINE = 'Macbook';

/** A new form: one-off work with three iterations, one Job at a time, and a $50 ceiling. */
export const EMPTY_STRATEGY_DRAFT: StrategyDraft = {
  name: '',
  objective: '',
  workType: 'one_off',
  maxAttempts: 3,
  versionCount: 3,
  owner: 'Admin',
  machineId: AHE_MACHINE,
  maxConcurrentJobs: 1,
  budgetLimit: '50',
};
