import type { GoldStandards } from './gold-standards';
import type { StrategyEvaluation } from './strategy-evaluation';
import type { UnitOfWork } from './unit-of-work';

/**
 * A 30-day cycle of Units of Work, graded at the end against gold standards.
 * `evaluation` stays null until the cycle has been graded.
 */
export interface Strategy {
  readonly id: string;
  readonly workflowId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly goldStandards: GoldStandards;
  readonly unitsOfWork: readonly UnitOfWork[];
  readonly evaluation: StrategyEvaluation | null;
}
