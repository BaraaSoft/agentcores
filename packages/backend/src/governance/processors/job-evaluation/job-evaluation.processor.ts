import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobEvaluationJobData } from '../../../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import { EvaluationReasoningService } from '../../../reasoning/evaluation/evaluation-reasoning.service';
import type { EvidenceRequest } from '../../../reasoning/evaluation/types/evidence-request';
import type { GatheredEvidence } from '../../../reasoning/evaluation/types/gathered-evidence';
import { WorkflowService } from '../../../workflow/workflow.service';
import type { JobEvaluationEntity } from '../../entities/job-evaluation.entity';
import { JobEvaluationService } from '../../services/job-evaluation.service';
import { JobService } from '../../services/job.service';
import { TaskService } from '../../services/task.service';
import { toTaskOutcome } from '../to-task-outcome';
import { EVALUATIONS_UNIT_NAME, JOB_NAME_MAX_LENGTH, MAX_JUDGING_ATTEMPTS } from './job-evaluation.constants';

/**
 * Marks the agent's own work. Once a day the **sweep** finds every Job that saw activity and opens a
 * judgement for each; **judging** then marks one Job out of 10 and records what was good and what was
 * not, in words the planner can act on.
 *
 * When the real outcome is not on record — how a post actually landed, whether a design meets its
 * brief — the evaluator does not guess. It files a Job to go and read it, parks the judgement, and
 * finishes the mark when that Job closes. Evidence Jobs are never themselves evaluated, so this
 * cannot feed on itself.
 *
 * A Job is marked again on later days whenever it sees fresh activity, because engagement arrives
 * long after the work is done.
 *
 * The whole round trip, and which state each step expects to find:
 *
 * ```text
 *  1. sweep  { workflowId, evaluationDate }   ← the daily cron, one message per Workflow
 *  2.   └─ per Job with activity: createEvaluation            → judging
 *  3.      └─ judge { evaluationId }                          (one message per Job)
 *  4.         ├─ scored          → recordScore                → scored    ✓ done
 *  5.         └─ needs_evidence  → placeJob + parkForEvidence  → awaiting_evidence
 *  6.            └─ the evidence Job runs on the job-execution queue, like any other Job
 *  7.               └─ it closes: JobExecutionProcessor.resumeEvaluation → judging
 *  8.                  └─ judge { evaluationId }               (step 3 again, evidence in hand)
 *  9.                     └─ scored → recordScore              → scored    ✓ done
 * ```
 *
 * Steps 5 to 8 are the only part that leaves this file, and the hand-off goes out through the Job
 * queue and comes back through the evaluation queue. Two things make that safe to repeat: every
 * transition is conditional on the state it expects, and the judgement is parked *before* its
 * evidence Job is queued, so the Job can never close looking for a judgement that is not yet waiting.
 */
@Processor(JOB_EVALUATION_QUEUE)
export class JobEvaluationProcessor extends WorkerHost {
  constructor(
    @InjectQueue(JOB_EVALUATION_QUEUE)
    private readonly evaluationQueue: Queue<JobEvaluationJobData>,
    @InjectQueue(JOB_EXECUTION_QUEUE)
    private readonly jobQueue: Queue<JobExecutionJobData>,
    private readonly evaluationReasoning: EvaluationReasoningService,
    private readonly workflows: WorkflowService,
    private readonly evaluations: JobEvaluationService,
    private readonly jobs: JobService,
    private readonly tasks: TaskService,
  ) {
    super();
  }

  /**
   * Runs whichever of the two kinds of message was queued — a day's `sweep` or one Job's `judge`.
   * Does nothing while the Workflow is not `running`.
   */
  async process(message: Job<JobEvaluationJobData>): Promise<void> {
    const data = message.data;
    const workflow = await this.workflows.findWorkflowById(data.workflowId);
    if (workflow?.state !== 'running') return;

    if (data.kind === 'sweep') return this.sweep(data.workflowId, data.evaluationDate);
    return this.judge(data.workflowId, data.evaluationId);
  }

  /**
   * Step 1–3. Opens a judgement for every Job that did something on `evaluationDate` and fans out one
   * `judge` message per Job. Re-running the sweep for the same day is safe: it finds the judgements it
   * already opened and skips any that have moved on, whether scored, failed, or parked on evidence.
   */
  private async sweep(workflowId: string, evaluationDate: string): Promise<void> {
    const jobs = await this.jobs.listJobsWithActivityOn({ workflowId, evaluationDate });
    for (const job of jobs) {
      const evaluation = await this.evaluations.createEvaluation({
        workflowId,
        jobId: job.id,
        unitOfWorkId: job.unitOfWorkId,
        evaluationDate,
      });
      if (evaluation.state !== 'judging') continue;
      await this.evaluationQueue.add(evaluation.id, { kind: 'judge', workflowId, evaluationId: evaluation.id });
    }
  }

  /**
   * Step 4–5, and step 8 when the evidence is back — the same entry point serves both, because what
   * tells them apart is the row, not the message: a judgement that has already been out for evidence
   * carries an `evidenceJobId`, and `gatheredEvidence` puts what came back in front of the model.
   *
   * Only acts on a judgement still in `judging`, so a message delivered twice does nothing the second
   * time. Gives up after `MAX_JUDGING_ATTEMPTS` throws, so one unmarkable Job never blocks the rest.
   */
  private async judge(workflowId: string, evaluationId: string): Promise<void> {
    const evaluation = await this.evaluations.findEvaluationById(evaluationId);
    if (evaluation === null || evaluation.state !== 'judging') return;

    if ((await this.evaluations.recordJudgingAttempt(evaluationId)) > MAX_JUDGING_ATTEMPTS) {
      await this.evaluations.failEvaluation(evaluationId, `judging threw ${MAX_JUDGING_ATTEMPTS} times`);
      return;
    }

    const { job } = evaluation;
    const tasks = await this.tasks.listTasks(job.id);
    const judgement = await this.evaluationReasoning.judgeJob({
      jobName: job.name,
      objective: job.objective,
      unitName: job.unitOfWork.name,
      successCriteria: job.unitOfWork.successCriteria,
      outcomeStatus: job.outcomeStatus,
      outcomeSummary: job.outcomeSummary,
      tasks: tasks.map(toTaskOutcome),
      evidence: await this.gatheredEvidence(evaluation),
    });

    if (judgement.verdict === 'scored') {
      const { verdict, ...score } = judgement;
      await this.evaluations.recordScore({ evaluationId, ...score });
      return;
    }
    await this.requestEvidence(workflowId, evaluation, judgement);
  }

  /**
   * Steps 5–6. Files the Job that will go and read the real outcome, under the Strategy's Evaluations
   * Unit, parks the judgement on it, and starts it. That Job then runs on the `job-execution` queue
   * like any other — nothing about it is special until it closes, which is where step 7 picks up.
   *
   * **The order of the last two writes matters.** Parking comes first, so the evidence Job cannot
   * close and go looking for a judgement that has not been recorded as waiting yet.
   *
   * One evidence round only: by step 8 the evaluator has been told the evidence is in, so asking a
   * second time means it cannot settle this Job at all.
   */
  private async requestEvidence(
    workflowId: string,
    evaluation: JobEvaluationEntity,
    request: EvidenceRequest,
  ): Promise<void> {
    if (evaluation.evidenceJobId !== null) {
      await this.evaluations.failEvaluation(evaluation.id, 'the evidence it asked for did not settle the mark');
      return;
    }
    const evidenceJob = await this.jobs.placeJob({
      strategyId: evaluation.job.unitOfWork.strategyId,
      plannedJob: {
        name: request.evidenceJobName.slice(0, JOB_NAME_MAX_LENGTH),
        objective: request.evidenceObjective,
        unitName: EVALUATIONS_UNIT_NAME,
      },
    });
    if (!(await this.evaluations.parkForEvidence(evaluation.id, evidenceJob.id))) return;
    const jobId = evidenceJob.id;
    await this.jobQueue.add(jobId, { workflowId, jobId }, { jobId });
  }

  /** What the evidence Job reported, once it has closed; null when none was ever asked for. */
  private async gatheredEvidence(evaluation: JobEvaluationEntity): Promise<GatheredEvidence | null> {
    if (evaluation.evidenceJobId === null) return null;
    const evidenceJob = await this.jobs.findJobById(evaluation.evidenceJobId);
    if (evidenceJob === null) return null;
    const tasks = await this.tasks.listTasks(evidenceJob.id);
    return {
      objective: evidenceJob.objective,
      outcomeStatus: evidenceJob.outcomeStatus,
      outcomeSummary: evidenceJob.outcomeSummary,
      tasks: tasks.map(toTaskOutcome),
    };
  }
}
