import { Injectable } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import {
  MAX_JOBS_PER_UNIT_OF_WORK,
  PLAN_UNIT_OF_WORK_MAX_FETCHES,
  PLAN_UNIT_OF_WORK_MAX_SEARCHES,
  PLAN_UNIT_OF_WORK_MAX_TOKENS,
  PLANNED_JOB_NAME_MAX_LENGTH,
  UNIT_OF_WORK_TITLE_MAX_LENGTH,
} from './strategy-reasoning.constants';
import { STRATEGY_REASONING_PROMPTS } from './strategy-reasoning.prompts';
import { UNIT_OF_WORK_PLAN_OUTPUT_SCHEMA } from './schemas/unit-of-work-plan-output.schema';
import type { PlanUnitOfWorkInput } from './types/plan-unit-of-work-input';
import type { UnitOfWorkPlan } from './types/unit-of-work-plan';

/**
 * Strategy-level reasoning: writes the Jobs of a Strategy's next Unit of Work, learning from how the
 * Jobs of its earlier Units were marked. It may search the web and read pages first, to learn what it plans.
 * It reads Job outcomes and marks only — never Tasks or steps —
 * and it never decides what a Unit is: the orchestrator opens the Unit, the planner only fills it.
 */
@Injectable()
export class StrategyReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Plans the next Unit's Jobs, or answers `done` when `input.canFinish` and the outcome is met.
   * Throws when it answers `done` where that is not allowed, so the orchestrator tries again on its
   * next pass; the answer schema already makes a plan carry at least one Job.
   */
  async planUnitOfWork(input: PlanUnitOfWorkInput): Promise<UnitOfWorkPlan> {
    const output = await this.model.completeStructured({
      systemPrompt: STRATEGY_REASONING_PROMPTS.planUnitOfWork.system({ canFetch: this.model.canFetch }),
      userPrompt: STRATEGY_REASONING_PROMPTS.planUnitOfWork.user(input),
      maxTokens: PLAN_UNIT_OF_WORK_MAX_TOKENS,
      schema: UNIT_OF_WORK_PLAN_OUTPUT_SCHEMA,
      webSearch: { maxSearches: PLAN_UNIT_OF_WORK_MAX_SEARCHES },
      webFetch: { maxFetches: PLAN_UNIT_OF_WORK_MAX_FETCHES },
    });

    if (output.decision === 'done') {
      if (!input.canFinish) throw new Error(`Strategy reasoning answered "done" for ${input.unitOfWorkName}, which must be planned`);
      return { decision: 'done', rationale: output.rationale };
    }
    const jobs = output.jobs.slice(0, MAX_JOBS_PER_UNIT_OF_WORK).map((job) => ({
      name: (job.name.trim() || job.objective).slice(0, PLANNED_JOB_NAME_MAX_LENGTH),
      objective: job.objective,
      orderType: job.orderType,
    }));
    const title = (output.title.trim() || jobs[0].name).slice(0, UNIT_OF_WORK_TITLE_MAX_LENGTH);
    return { decision: 'plan', title, rationale: output.rationale.trim(), jobs };
  }
}
