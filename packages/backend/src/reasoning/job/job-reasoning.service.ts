import { Injectable } from '@nestjs/common';
import { ToolsetFactory } from '../tools/toolset.factory';
import { JobReasoningModelClient } from './job-reasoning-model.client';
import {
  MAX_TASKS_PER_JOB,
  PLAN_TASKS_MAX_TOKENS,
  PLAN_TASKS_MAX_TURNS,
  REVIEW_JOB_MAX_TOKENS,
} from './job-reasoning.constants';
import { JOB_REASONING_PROMPTS } from './job-reasoning.prompts';
import { JOB_REVIEW_SCHEMA } from './schemas/job-review.schema';
import type { JobPlanningInput } from './types/job-planning-input';
import type { JobReview } from './types/job-review';
import type { JobReviewInput } from './types/job-review-input';

/**
 * Job-level reasoning: one objective, such as "Engage with r/AICompanion". Two separate jobs:
 * reviewing judges each finished Task (continue, revise, met, abandon) in one structured call, and
 * planning edits the remaining plan through the planning tools and returns it. It reads Task outcomes only —
 * never individual steps. Marking a finished Job belongs to `EvaluationReasoningService`, not here.
 */
@Injectable()
export class JobReasoningService {
  constructor(
    private readonly model: JobReasoningModelClient,
    private readonly toolsets: ToolsetFactory,
  ) {}

  /**
   * Judges the Task that just finished against the objective and the remaining plan.
   */
  async reviewJob(input: JobReviewInput): Promise<JobReview> {
    return this.model.completeStructured({
      systemPrompt: JOB_REASONING_PROMPTS.reviewJob.system,
      userPrompt: JOB_REASONING_PROMPTS.reviewJob.user(input),
      maxTokens: REVIEW_JOB_MAX_TOKENS,
      schema: JOB_REVIEW_SCHEMA,
    });
  }

  /**
   * Lets the model edit the Job's remaining plan with the planning tools until it calls `finish_plan`,
   * then returns the edited plan. Saves nothing; the caller writes the result.
   */
  async planTasks(input: JobPlanningInput): Promise<readonly string[]> {
    const toolset = this.toolsets.createJobPlanningToolset(input.remainingActions, MAX_TASKS_PER_JOB - input.tasksStarted);
    await this.model.runToolLoop({
      systemPrompt: JOB_REASONING_PROMPTS.planTasks.system,
      userPrompt: JOB_REASONING_PROMPTS.planTasks.user(input),
      maxTokens: PLAN_TASKS_MAX_TOKENS,
      maxTurns: PLAN_TASKS_MAX_TURNS,
      tools: toolset.tools,
    });
    return toolset.actions;
  }
}
