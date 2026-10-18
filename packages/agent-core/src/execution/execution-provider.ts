import type { ExecutionResult } from './execution-result';
import type { ExecutionTask } from './execution-task';

/**
 * Contract for anything that can carry out a mechanical instruction on a machine.
 * The backend's Task processor depends only on this interface; `@ahe/execution` implements it.
 * Keeping it here lets the implementation move to another process later without touching the backend.
 */
export interface ExecutionProvider {
  /**
   * Runs the computer-use loop (screenshot → decide → act) until the instruction
   * is done, fails, hits `maxSteps`, or `signal` is aborted.
   */
  runTask(task: ExecutionTask, signal?: AbortSignal): Promise<ExecutionResult>;
}
