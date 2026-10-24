import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { STRATEGY_EVALUATION_QUEUE } from '../../queue/queue.constants';
import type { WorkflowJobData } from '../../queue/types/workflow-job-data';
import { StrategyEvaluationService } from '../services/strategy-evaluation.service';

/**
 * Worker for the end-of-cycle review. Triggered by the orchestrator's repeatable
 * job when a Strategy's 30 days are up.
 */
@Processor(STRATEGY_EVALUATION_QUEUE)
export class StrategyEvaluationProcessor extends WorkerHost {
  constructor(private readonly evaluation: StrategyEvaluationService) {
    super();
  }

  /**
   * Reviews the Workflow's active Strategy and applies the result.
   */
  async process(message: Job<WorkflowJobData>): Promise<void> {
    throw new Error('Not implemented');
  }
}
