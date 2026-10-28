import type { GoldStandards } from './gold-standards';
import type { StrategyEvaluation } from './strategy-evaluation';
import type { UnitOfWork } from './unit-of-work';

/**
 * A 30-day cycle of Units of Work for one owner, graded at the end against gold standards. It is the
 * root of governance and can run on several machines, each through its own Workflow.
 * `evaluation` stays null until the cycle has been graded.
 */
export interface Strategy {
  readonly id: string;
  /** HumanExperiences user ID of the person this Strategy acts for. */
  readonly owner: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly goldStandards: GoldStandards;
  readonly unitsOfWork: readonly UnitOfWork[];
  readonly evaluation: StrategyEvaluation | null;
}
