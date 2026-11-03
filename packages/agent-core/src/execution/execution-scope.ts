/**
 * Where one instruction sits in its Job, so the execution layer does only its share: the Task the instruction
 * is a step of, and the Job's later Tasks, whose work it must leave to them.
 */
export interface ExecutionScope {
  /** The action of the Task this instruction is one step of. */
  readonly taskAction: string;
  /** The actions of the Job's Tasks that run after this one, in order. Empty for the last Task. */
  readonly laterTasks: readonly string[];
}
