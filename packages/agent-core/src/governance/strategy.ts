import type { GoldStandards } from './gold-standards';
import type { StrategyEvaluation } from './strategy-evaluation';
import type { StrategyStatus } from './strategy-status';
import type { StrategyWorkType } from './strategy-work-type';
import type { UnitOfWork } from './unit-of-work';

/**
 * What one owner wants done, and how the work repeats. It is the root of governance — Strategy →
 * Unit of Work → Job → Task — and can run on several machines, each through its own Workflow.
 */
export interface Strategy {
  readonly id: string;
  /** HumanExperiences user ID of the person this Strategy acts for. */
  readonly owner: string;
  readonly name: string;
  /** The outcome the owner wants, in their words. Every Unit is planned against it. */
  readonly objective: string;
  readonly workType: StrategyWorkType;
  /** How many versions a `multi_version` Strategy makes; null for the other work types. */
  readonly versionCount: number | null;
  /** Most attempts a `one_off` Strategy makes before it stops. */
  readonly maxAttempts: number;
  readonly status: StrategyStatus;
  readonly startDate: Date;
  /** When the Strategy completed; null while it is active. */
  readonly endDate: Date | null;
  /** For the Strategy review, which is not built yet. */
  readonly goldStandards: GoldStandards | null;
  readonly unitsOfWork: readonly UnitOfWork[];
  readonly evaluation: StrategyEvaluation | null;
}
