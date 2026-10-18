import type { AccountCredentials } from './account-credentials';

/**
 * What the backend's Task processor hands to the execution layer: one mechanical instruction
 * plus the minimum context needed to carry it out.
 * `context` must be built from the safe memory zone only — never sealed data.
 */
export interface ExecutionTask {
  readonly taskId: string;
  /** Concrete instruction, e.g. "Open r/AICompanion and reply to the top thread with this text: …". */
  readonly instruction: string;
  readonly context: string;
  /** Hard cap on computer-use loop iterations before giving up. */
  readonly maxSteps: number;
  /** Login for the account this task acts as, so a signed-out session can be resumed. `null` when none is needed. */
  readonly credentials: AccountCredentials | null;
}
