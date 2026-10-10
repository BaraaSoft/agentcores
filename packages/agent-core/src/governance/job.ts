import type { Task } from './task';

/**
 * A collection of related Tasks with one clear objective,
 * always tagged to a Unit of Work.
 */
export interface Job {
  readonly id: string;
  readonly unitOfWorkId: string;
  readonly name: string;
  readonly objective: string;
  readonly tasks: readonly Task[];
}
