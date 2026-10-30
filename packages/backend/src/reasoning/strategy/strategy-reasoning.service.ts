import { Injectable } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import { MAX_JOBS_PER_UNIT, PLAN_UNIT_MAX_TOKENS, PLANNED_JOB_NAME_MAX_LENGTH } from './strategy-reasoning.constants';
import { STRATEGY_REASONING_PROMPTS } from './strategy-reasoning.prompts';
import { UNIT_PLAN_OUTPUT_SCHEMA } from './schemas/unit-plan-output.schema';
import type { PlanUnitInput } from './types/plan-unit-input';
import type { UnitPlan } from './types/unit-plan';

/**
 * Strategy-level reasoning: writes the Jobs of a Strategy's next Unit of Work, learning from how the
 * Jobs of its earlier Units were marked. It reads Job outcomes and marks only — never Tasks or steps —
 * and it never decides what a Unit is: the orchestrator opens the Unit, the planner only fills it.
 */
@Injectable()
export class StrategyReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Plans the next Unit's Jobs, or answers `done` when `input.canFinish` and the outcome is met.
   * Throws when the answer is unusable — no Jobs, or `done` where it is not allowed — so the
   * orchestrator tries again on its next pass.
   */
  async planUnitOfWork(input: PlanUnitInput): Promise<UnitPlan> {
    const output = await this.model.completeStructured({
      systemPrompt: STRATEGY_REASONING_PROMPTS.planUnitOfWork.system,
      userPrompt: STRATEGY_REASONING_PROMPTS.planUnitOfWork.user(input),
      maxTokens: PLAN_UNIT_MAX_TOKENS,
      schema: UNIT_PLAN_OUTPUT_SCHEMA,
    });

    if (output.decision === 'done') {
      if (!input.canFinish) throw new Error(`Strategy reasoning answered "done" for ${input.unitName}, which must be planned`);
      return { decision: 'done', rationale: output.rationale };
    }
    const jobs = output.jobs
      .filter((job) => job.objective.trim() !== '')
      .slice(0, MAX_JOBS_PER_UNIT)
      .map((job) => ({
        name: (job.name.trim() || job.objective).slice(0, PLANNED_JOB_NAME_MAX_LENGTH),
        objective: job.objective,
        orderType: job.orderType,
      }));
    if (jobs.length === 0) throw new Error(`Strategy reasoning planned no Jobs for ${input.unitName}`);
    return { decision: 'plan', rationale: output.rationale, jobs };
  }
}
