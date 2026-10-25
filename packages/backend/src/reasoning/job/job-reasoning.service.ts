import { Injectable } from '@nestjs/common';
import type { ReasoningTool } from '../types/reasoning-tool';
import { JobReasoningModelClient } from './job-reasoning-model.client';
import {
  EVALUATE_JOB_MAX_TOKENS,
  PLAN_TASKS_MAX_TOKENS,
  PLAN_TASKS_MAX_TURNS,
  REVIEW_JOB_MAX_TOKENS,
} from './job-reasoning.constants';
import { JOB_REASONING_PROMPTS } from './job-reasoning.prompts';
import { JOB_EVALUATION_OUTPUT_SCHEMA } from './schemas/job-evaluation-output.schema';
import { JOB_REVIEW_SCHEMA } from './schemas/job-review.schema';
import type { EvaluateJobInput } from './types/evaluate-job-input';
import type { JobEvaluation } from './types/job-evaluation';
import type { JobPlanningInput } from './types/job-planning-input';
import type { JobReview } from './types/job-review';
import type { JobReviewInput } from './types/job-review-input';

/**
 * Job-level reasoning: one objective, such as "Engage with r/AICompanion". Two separate jobs:
 * reviewing judges each finished Task (continue, revise, met, abandon) in one structured call, and
 * planning edits the remaining plan through tools the caller provides. It reads Task outcomes only —
 * never individual steps.
 */
@Injectable()
export class JobReasoningService {
  constructor(private readonly model: JobReasoningModelClient) {}

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
   * Edits the Job's remaining plan with `tools` until the model calls the tool that ends planning.
   * The tools hold the result; this method returns nothing.
   */
  async planTasks(input: JobPlanningInput, tools: readonly ReasoningTool[]): Promise<void> {
    await this.model.runToolLoop({
      systemPrompt: JOB_REASONING_PROMPTS.planTasks.system,
      userPrompt: JOB_REASONING_PROMPTS.planTasks.user(input),
      maxTokens: PLAN_TASKS_MAX_TOKENS,
      maxTurns: PLAN_TASKS_MAX_TURNS,
      tools,
    });
  }

  /**
   * Judges a Job still open at cycle end against its objective, producing the summary the Unit review reads.
   */
  async evaluateJob(input: EvaluateJobInput): Promise<JobEvaluation> {
    const output = await this.model.completeStructured({
      systemPrompt: JOB_REASONING_PROMPTS.evaluateJob.system,
      userPrompt: JOB_REASONING_PROMPTS.evaluateJob.user(input),
      maxTokens: EVALUATE_JOB_MAX_TOKENS,
      schema: JOB_EVALUATION_OUTPUT_SCHEMA,
    });
    return { jobId: input.jobId, jobName: input.jobName, outcomeStatus: null, ...output };
  }
}
