import { Injectable } from '@nestjs/common';
import { JobReasoningModelClient } from './job-reasoning-model.client';
import { EVALUATE_JOB_MAX_TOKENS, PLAN_TASKS_MAX_TOKENS } from './job-reasoning.constants';
import { JOB_REASONING_PROMPTS } from './job-reasoning.prompts';
import { JOB_EVALUATION_OUTPUT_SCHEMA } from './schemas/job-evaluation-output.schema';
import { JOB_PLAN_SCHEMA } from './schemas/job-plan.schema';
import type { EvaluateJobInput } from './types/evaluate-job-input';
import type { JobEvaluation } from './types/job-evaluation';
import type { JobPlan } from './types/job-plan';
import type { JobReasoningInput } from './types/job-reasoning-input';

/**
 * Job-level reasoning: one objective, such as "Engage with r/AICompanion". Plans the Tasks that
 * achieve it, revises the plan after every finished Task, and decides when the Job is over.
 * It reads Task outcomes only — never individual steps.
 */
@Injectable()
export class JobReasoningService {
  constructor(private readonly model: JobReasoningModelClient) {}

  /**
   * The plan for every Task not started yet. First call (no outcomes): the full ordered plan.
   * After each finished Task: continue, edit the plan, or end the Job as met or abandoned.
   */
  async planTasks(input: JobReasoningInput): Promise<JobPlan> {
    return this.model.completeStructured({
      systemPrompt: JOB_REASONING_PROMPTS.planTasks.system,
      userPrompt: JOB_REASONING_PROMPTS.planTasks.user(input),
      maxTokens: PLAN_TASKS_MAX_TOKENS,
      schema: JOB_PLAN_SCHEMA,
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
