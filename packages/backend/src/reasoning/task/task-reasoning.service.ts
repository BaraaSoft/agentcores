import { Injectable, NotImplementedException } from '@nestjs/common';
import { TaskReasoningModelClient } from './task-reasoning-model.client';
import type { BlockerDecision } from './types/blocker-decision';
import type { PlannedStep } from './types/planned-step';
import type { TaskReasoningInput } from './types/task-reasoning-input';

/**
 * Task-level reasoning for the step loop the Task processor runs. Decides each next step and handles
 * blockers. It is the only level whose decisions reach the execution layer (the processor carries
 * them out), and it reads execution results as text only — never screenshots.
 * This is the hot path: it runs on every step.
 */
@Injectable()
export class TaskReasoningService {
  constructor(private readonly model: TaskReasoningModelClient) {}

  /**
   * Judges the latest result in `history` and decides the next step: retry, move on, or mark the
   * Task done (`isTaskDone`).
   */
  async planNextStep(input: TaskReasoningInput): Promise<PlannedStep> {
    throw new NotImplementedException();
  }

  /**
   * Decides what to do when the last step in `history` came back `blocked` (CAPTCHA, verification
   * code, rate limit, …). Plans its own way around the gate, or asks the owner only for gates that
   * only the owner can clear.
   */
  async decideOnBlocker(input: TaskReasoningInput): Promise<BlockerDecision> {
    throw new NotImplementedException();
  }
}
