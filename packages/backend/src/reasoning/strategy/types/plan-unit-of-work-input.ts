import type { StrategyWorkType } from '@ahe/agent-core';
import type { JobEvaluation } from '../../evaluation/types/job-evaluation';
import type { EarlierUnitOfWork } from './earlier-unit-of-work';

/**
 * What the planner needs to write the Jobs of a Strategy's next Unit of Work.
 */
export interface PlanUnitOfWorkInput {
  readonly strategyName: string;
  /** The outcome the owner wants, in their words. */
  readonly objective: string;
  readonly workType: StrategyWorkType;
  /** The Unit being planned, e.g. "Attempt 2". */
  readonly unitOfWorkName: string;
  /** Versions for `multi_version`, attempts for `one_off`; null for `continuous`, which has no end. */
  readonly unitOfWorkLimit: number | null;
  /** True when the planner may answer `done` instead of Jobs: a `one_off` Strategy after its first attempt. */
  readonly canFinish: boolean;
  /** The Strategy's most recent earlier Units, oldest first. Empty for its first Unit. */
  readonly earlierUnitsOfWork: readonly EarlierUnitOfWork[];
  /** Scored Jobs from the owner's other Strategies with a similar objective, closest first. */
  readonly relatedEvaluations: readonly JobEvaluation[];
}
