import { Injectable, NotImplementedException } from '@nestjs/common';
import { PLANNED_STEP_SCHEMA } from './schemas/planned-step.schema';
import { renderTaskSkillPrompt } from './skills/render-task-skill-prompt';
import { TASK_SKILLS } from './skills/task-skill-registry';
import { TaskReasoningModelClient } from './task-reasoning-model.client';
import { PLAN_NEXT_STEP_MAX_TOKENS } from './task-reasoning.constants';
import { TASK_REASONING_PROMPTS } from './task-reasoning.prompts';
import type { BlockerDecision } from './types/blocker-decision';
import type { PlannedStep } from './types/planned-step';
import type { TaskReasoningInput } from './types/task-reasoning-input';

/**
 * Task-level reasoning for the step loop the Task processor runs. Decides each next step and handles
 * blockers, with the system prompt of the Task's skill. It is the only level whose decisions reach the
 * execution layer (the processor carries them out), and it reads execution results as text only.
 * This is the hot path: it runs on every step.
 */
@Injectable()
export class TaskReasoningService {
  constructor(private readonly model: TaskReasoningModelClient) {}

  /**
   * Judges the latest result in `history` and decides the next step: retry, move on, or mark the
   * Task done (`isTaskDone`). Throws when the answer is neither done nor a usable step, so the Task
   * processor fails the Task and Job reasoning reviews it.
   */
  async planNextStep(input: TaskReasoningInput): Promise<PlannedStep> {
    const output = await this.model.completeStructured({
      systemPrompt: renderTaskSkillPrompt(TASK_SKILLS[input.skillType]),
      userPrompt: TASK_REASONING_PROMPTS.planNextStep.user(input),
      maxTokens: PLAN_NEXT_STEP_MAX_TOKENS,
      schema: PLANNED_STEP_SCHEMA,
    });

    const rationale = output.rationale.trim();
    if (output.isTaskDone) {
      return { instruction: '', rationale, platform: null, needsHumanJudgment: false, isTaskDone: true };
    }
    const instruction = output.instruction.trim();
    if (instruction === '') throw new Error(`Task reasoning planned an empty step for "${input.taskAction}"`);
    return {
      instruction,
      rationale,
      platform: output.platform?.trim().toLowerCase() || null,
      needsHumanJudgment: output.needsHumanJudgment,
      isTaskDone: false,
    };
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
