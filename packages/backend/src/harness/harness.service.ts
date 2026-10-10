import type { ExecutionProvider, ExecutionResult } from '@ahe/agent-core';
import { Inject, Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { MetricsService } from '../governance/services/metrics.service';
import { TaskService } from '../governance/services/task.service';
import { MemoryRetrievalService } from '../memory/memory-retrieval.service';
import { IdentityService } from '../identity/identity.service';
import { PrivacyFilterService } from '../memory/privacy-filter.service';
import { ReasoningService } from '../reasoning/reasoning.service';
import type { PlannedStep } from '../reasoning/types/planned-step';
import type { StepRecord } from '../reasoning/types/step-record';
import { ReportingService } from '../reporting/reporting.service';
import { StepRouterService } from '../router/step-router.service';
import { EXECUTION_PROVIDER } from './harness.tokens';
import type { ExecuteTaskInput } from './types/execute-task-input';
import type { HarnessIteration } from './types/harness-iteration';
import type { TaskContext } from './types/task-context';
import type { TaskRunOutcome } from './types/task-run-outcome';

/**
 * The harness: runs one Task end to end.
 *
 *   reason (Opus) → route → execute (Sonnet/Haiku, on screen) → summarise → reason … until done.
 *
 * The reasoning layer only ever sees text summaries; screenshots stay inside the
 * ExecutionProvider. Memory enters through the privacy wall only. Account logins come from
 * IdentityService and go straight to the execution layer — the reasoning layer never sees them.
 */
@Injectable()
export class HarnessService {
  private readonly logger = new Logger(HarnessService.name);

  constructor(
    @Inject(EXECUTION_PROVIDER)
    private readonly executionProvider: ExecutionProvider,
    private readonly reasoning: ReasoningService,
    private readonly router: StepRouterService,
    private readonly memory: MemoryRetrievalService,
    private readonly privacyFilter: PrivacyFilterService,
    private readonly tasks: TaskService,
    private readonly metrics: MetricsService,
    private readonly reporting: ReportingService,
    private readonly identity: IdentityService,
  ) {}

  /**
   * Runs the Task through the loop, records its result, and stores any learnings.
   * Never throws for expected outcomes — failure and escalation are returned as statuses.
   */
  async executeTask(input: ExecuteTaskInput): Promise<TaskRunOutcome> {
    throw new NotImplementedException();
  }

  /**
   * Loads the Task's lineage and owner, and fetches privacy-filtered memory for it.
   */
  private async buildTaskContext(taskId: string): Promise<TaskContext> {
    throw new NotImplementedException();
  }

  /**
   * One round: ask the reasoning layer for the next step, route it, and carry it out.
   */
  private async runIteration(context: TaskContext, history: readonly StepRecord[], signal?: AbortSignal): Promise<HarnessIteration> {
    throw new NotImplementedException();
  }

  /**
   * Sends a mechanical step to the execution layer. Checks the instruction for
   * sealed topics first, so nothing sealed is ever typed or posted, and attaches the
   * login for `step.platform` when the workflow has an account there.
   */
  private async executeMechanicalStep(context: TaskContext, step: PlannedStep, signal?: AbortSignal): Promise<ExecutionResult> {
    throw new NotImplementedException();
  }

  /**
   * Handles a step the execution layer reported as `blocked`: logs the gate against the account,
   * asks the reasoning layer what to do, and turns the decision into the next move —
   * keep going with a new plan (`change_approach`, `switch_channel`, `use_official_api`),
   * defer the Task (`retry_later`), escalate to the owner (`request_owner`), or fail it (`abandon`).
   */
  private async handleBlocker(
    context: TaskContext,
    step: PlannedStep,
    result: ExecutionResult,
    history: readonly StepRecord[],
  ): Promise<HarnessIteration> {
    throw new NotImplementedException();
  }

  /**
   * Saves the final status, metric readings, and learnings for the Task.
   */
  private async finishTask(context: TaskContext, outcome: TaskRunOutcome, readings: Readonly<Record<string, number>>): Promise<void> {
    throw new NotImplementedException();
  }
}
