import type { TaskOutcome } from './task-outcome';

/**
 * Another Job of the same Unit of Work that has closed. Job reasoning sees what its Tasks made and where, so
 * this Job builds on that work instead of searching for it again.
 */
export interface FinishedSiblingJob {
  readonly name: string;
  /** Its complete Tasks, in order. */
  readonly outcomes: readonly TaskOutcome[];
}
