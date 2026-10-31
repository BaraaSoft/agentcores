import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import { JOB_EVALUATION_QUEUE, JOB_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import type { JobEvaluationJobData } from '../../../queue/types/job-evaluation-job-data';
import type { JobExecutionJobData } from '../../../queue/types/job-execution-job-data';
import { EvaluationReasoningService } from '../../../reasoning/evaluation/evaluation-reasoning.service';
import type { EvidenceRequest } from '../../../reasoning/evaluation/types/evidence-request';
import type { GatheredEvidence } from '../../../reasoning/evaluation/types/gathered-evidence';
import type { JobEvaluationEntity } from '../../entities/job-evaluation.entity';
import { JobEvaluationService } from '../../services/job-evaluation.service';
import { JobScreenshotService } from '../../services/job-screenshot.service';
import { JobService } from '../../services/job.service';
import { TaskService } from '../../services/task.service';
import { toTaskOutcome } from '../to-task-outcome';
import { JOB_NAME_MAX_LENGTH, MAX_JUDGING_ATTEMPTS } from './job-evaluation.constants';

/**
 * Marks the agent's own work. The orchestrator opens one judgement for each Job of a Unit of Work once
 * the Unit is due — straight after its last Job closes for an artifact, a day later for ongoing work
 * whose response takes time — and sends one `evaluate` message per Job. Evaluating marks the Job out of 10
 * and records what was good and what was not, in words the planner of the next Unit can act on.
 *
 * When the real outcome is not on record — how a post actually landed, whether a design meets its
 * brief — the evaluator does not guess. It files a Job in the same Unit to go and read it, parks the
 * judgement, and finishes the mark when that Job closes. Evidence Jobs are never themselves evaluated,
 * so this cannot feed on itself.
 *
 * The whole round trip, and which state each step expects to find:
 *
 * ```text
 *  1. the orchestrator: the Unit is due → createEvaluation per Job → evaluating
 *  2.   └─ evaluate { evaluationId }                       (one message per Job)
 *  3.      ├─ scored          → recordScore                → scored    ✓ done
 *  4.      └─ needs_evidence  → createJob + parkForEvidence → awaiting_evidence
 *              (only for the work itself; judgeJob searches the web for the standard)
 *  5.         └─ the evidence Job runs on the job-execution queue, like any other Job
 *  6.            └─ it closes: JobExecutionProcessor.resumeEvaluation → evaluating
 *  7.               └─ evaluate { evaluationId }            (step 2 again, evidence in hand)
 *  8.                  └─ scored → recordScore              → scored    ✓ done
 * ```
 *
 * Steps 4 to 7 are the only part that leaves this file, and the hand-off goes out through the Job
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
    private readonly evaluations: JobEvaluationService,
    private readonly jobs: JobService,
    private readonly tasks: TaskService,
    private readonly screenshots: JobScreenshotService,
  ) {
    super();
  }

  /**
   * Judges the one Job the message names.
   *
   * There is no pause gate here. Judging only reads work that is already done, and a judgement
   * skipped while paused would stay in `evaluating` with nothing to queue it again. The one part of
   * evaluation that acts on the screen is the evidence Job, and the Job processor gates that on its
   * own Unit of Work like any other Job.
   */
  async process(message: Job<JobEvaluationJobData>): Promise<void> {
    return this.evaluate(message.data.workflowId, message.data.evaluationId);
  }

  /**
   * Steps 2–4, and step 7 when the evidence is back — the same entry point serves both, because what
   * tells them apart is the row, not the message: a judgement that has already been out for evidence
   * carries an `evidenceJobId`, and `gatheredEvidence` puts what came back in front of the model.
   *
   * Only acts on a judgement still in `evaluating`, so a message delivered twice does nothing the second
   * time. Gives up after `MAX_JUDGING_ATTEMPTS` throws, so one unmarkable Job never blocks the rest.
   */
  private async evaluate(workflowId: string, evaluationId: string): Promise<void> {
    const evaluation = await this.evaluations.findEvaluationById(evaluationId);
    if (evaluation === null || evaluation.state !== 'evaluating') return;

    if ((await this.evaluations.recordJudgingAttempt(evaluationId)) > MAX_JUDGING_ATTEMPTS) {
      await this.evaluations.failEvaluation(evaluationId, `judging threw ${MAX_JUDGING_ATTEMPTS} times`);
      return;
    }

    const { job } = evaluation;
    const tasks = await this.tasks.listTasks(job.id);
    const judgement = await this.evaluationReasoning.judgeJob({
      jobName: job.name,
      objective: job.objective,
      strategyObjective: job.unitOfWork.strategy.objective,
      outcomeStatus: job.outcomeStatus,
      outcomeSummary: job.outcomeSummary,
      tasks: tasks.map(toTaskOutcome),
      evidence: await this.gatheredEvidence(evaluation),
      screenshot: await this.screenshots.findLatestJobScreenshot(job.id),
    });

    if (judgement.verdict === 'scored') {
      const { verdict, ...score } = judgement;
      await this.evaluations.recordScore({ evaluationId, ...score });
      return;
    }
    await this.requestEvidence(workflowId, evaluation, judgement);
  }

  /**
   * Steps 4–5. Files the Job that will go and read the real outcome, in the Unit being judged, parks
   * the judgement on it, and starts it. The orchestrator still starts Jobs in a `evaluating` Unit, so a
   * restart picks it up even if this queue write is lost. That Job then runs on the `job-execution` queue
   * like any other — nothing about it is special until it closes, which is where step 6 picks up.
   *
   * **The order of the last two writes matters.** Parking comes first, so the evidence Job cannot
   * close and go looking for a judgement that has not been recorded as waiting yet.
   *
   * One evidence round only: by step 7 the evaluator has been told the evidence is in, so asking a
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
    const evidenceJob = await this.jobs.createJob({
      unitOfWorkId: evaluation.unitOfWorkId,
      name: request.evidenceJobName.slice(0, JOB_NAME_MAX_LENGTH),
      objective: this.evidenceObjective(request),
    });
    if (!(await this.evaluations.parkForEvidence(evaluation.id, evidenceJob.id))) return;
    const jobId = evidenceJob.id;
    await this.jobQueue.add(jobId, { workflowId, jobId }, { jobId });
  }

  /**
   * The errand as a Job objective. Where the mark turns on quality that has to be seen, the criteria
   * the evaluator drew from its research are listed with the key each reading must come back under,
   * so the standard reaches the one agent that can actually look at the work. Everything the errand
   * needs is in this one objective: planning and execution never see the judgement behind it.
   */
  private evidenceObjective(request: EvidenceRequest): string {
    if (request.evidenceCriteria.length === 0) return request.evidenceObjective;
    const criteria = request.evidenceCriteria
      .map((criterion, index) => `${index + 1}. (${criterion.key}) ${criterion.whatToExamine}`)
      .join('\n');
    return `${request.evidenceObjective}

Open the work once and rate each of these from 1 to 10, reporting each as a metric reading under the key in brackets:
${criteria}`;
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
