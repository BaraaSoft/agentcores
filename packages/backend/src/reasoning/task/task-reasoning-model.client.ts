import { ReasoningModelClient } from '../reasoning-model.client';

/**
 * The model client for Task reasoning, configured with `REASONING_TASK_PROVIDER` and `REASONING_TASK_MODEL_ID`.
 * Task reasoning runs on every step, so this is where model cost concentrates.
 */
export class TaskReasoningModelClient extends ReasoningModelClient {}
