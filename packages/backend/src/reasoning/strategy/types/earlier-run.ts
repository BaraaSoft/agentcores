import type { EarlierUnitOfWork } from './earlier-unit-of-work';

/**
 * A finished or stopped earlier run of the same Strategy: its number and its latest Units of Work.
 */
export interface EarlierRun {
  /** 1 for the Strategy's first run, then 2, 3, … */
  readonly runNumber: number;
  readonly unitsOfWork: readonly EarlierUnitOfWork[];
}
