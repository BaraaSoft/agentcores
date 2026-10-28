import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmbeddingClient } from '../../embedding/embedding.client';
import { EMBEDDING_DIMENSIONS } from '../../embedding/embedding.constants';
import { JobEvaluationEntity } from '../entities/job-evaluation.entity';
import type { CreateJobEvaluationInput } from '../types/create-job-evaluation-input';
import type { RecordJobScoreInput } from '../types/record-job-score-input';
import type { SearchJobEvaluationsInput } from '../types/search-job-evaluations-input';

/** The pgvector type every stored objective vector is compared as. */
const VECTOR = `vector(${EMBEDDING_DIMENSIONS})`;

/**
 * Persistence of Job evaluations, and the search over them. Each row moves through its states once:
 * `judging` → `scored`, or by way of `awaiting_evidence` when the judgement needs a real-world
 * reading first.
 *
 * One method owns each move, and each is conditional on the state it expects, returning whether it
 * actually won — so a message delivered twice changes nothing the second time:
 *
 * ```text
 * createEvaluation      (new row)                   → judging
 * parkForEvidence       judging                     → awaiting_evidence
 * resumeFromEvidence    awaiting_evidence           → judging
 * recordScore           judging | awaiting_evidence → scored
 * failEvaluation        judging | awaiting_evidence → failed
 * ```
 *
 * `JobEvaluationProcessor` maps out when each of these is called.
 */
@Injectable()
export class JobEvaluationService {
  constructor(
    @InjectRepository(JobEvaluationEntity)
    private readonly evaluations: Repository<JobEvaluationEntity>,
    private readonly embeddings: EmbeddingClient,
  ) {}

  /**
   * Opens the judgement of one Job for one day, or returns the one already opened.
   */
  async createEvaluation(input: CreateJobEvaluationInput): Promise<JobEvaluationEntity> {
    await this.evaluations.createQueryBuilder().insert().values({ ...input }).orIgnore().execute();
    return this.evaluations.findOneByOrFail({ jobId: input.jobId, evaluationDate: input.evaluationDate });
  }

  /**
   * Returns the evaluation with its Job and the Job's Unit loaded, or null.
   */
  async findEvaluationById(evaluationId: string): Promise<JobEvaluationEntity | null> {
    return this.evaluations.findOne({ where: { id: evaluationId }, relations: { job: { unitOfWork: true } } });
  }

  /**
   * The evaluation waiting on `evidenceJobId`, if that Job was spun up for one. This is how a
   * parked judgement is found again once its evidence Job closes.
   */
  async findEvaluationAwaiting(evidenceJobId: string): Promise<JobEvaluationEntity | null> {
    return this.evaluations.findOne({ where: { evidenceJobId, state: 'awaiting_evidence' } });
  }

  /**
   * Counts one more judgement attempt and returns the new count. Atomic, so concurrent deliveries
   * each get their own number.
   */
  async recordJudgingAttempt(evaluationId: string): Promise<number> {
    const update = await this.evaluations
      .createQueryBuilder()
      .update(JobEvaluationEntity)
      .set({ attempts: () => '"attempts" + 1' })
      .where('id = :evaluationId', { evaluationId })
      .returning('"attempts"')
      .execute();
    const row = (update.raw as { attempts: number }[])[0];
    return row?.attempts ?? 0;
  }

  /**
   * Parks the judgement until `evidenceJobId` closes. Returns false when it was already settled.
   */
  async parkForEvidence(evaluationId: string, evidenceJobId: string): Promise<boolean> {
    const update = await this.evaluations.update(
      { id: evaluationId, state: 'judging' },
      { state: 'awaiting_evidence', evidenceJobId },
    );
    return (update.affected ?? 0) > 0;
  }

  /**
   * Wakes a parked judgement so it can be judged again now its evidence is in.
   */
  async resumeFromEvidence(evaluationId: string): Promise<boolean> {
    const update = await this.evaluations.update({ id: evaluationId, state: 'awaiting_evidence' }, { state: 'judging' });
    return (update.affected ?? 0) > 0;
  }

  /**
   * Stores the score and feedback, embedding the objective summary so the planner can find this Job
   * later by what it set out to do. Returns false when the judgement was already settled.
   */
  async recordScore(input: RecordJobScoreInput): Promise<boolean> {
    const { evaluationId, ...judgement } = input;
    const objectiveEmbedding = await this.embeddings.embed(judgement.objectiveSummary);
    const update = await this.evaluations.update(
      { id: evaluationId, state: In(['judging', 'awaiting_evidence']) },
      { ...judgement, objectiveEmbedding, state: 'scored' },
    );
    return (update.affected ?? 0) > 0;
  }

  /**
   * Gives up on a judgement, recording in `rubric` why it was never made. Returns false when it had
   * already settled.
   */
  async failEvaluation(evaluationId: string, reason: string): Promise<boolean> {
    const update = await this.evaluations.update(
      { id: evaluationId, state: In(['judging', 'awaiting_evidence']) },
      { state: 'failed', rubric: `Not judged: ${reason}` },
    );
    return (update.affected ?? 0) > 0;
  }

  /**
   * The scored Jobs whose objective is closest in meaning to `input.objective`, nearest first. The
   * search is scoped to one Workflow, so what the agent learnt for one owner never reaches another's
   * planning. Cosine distance is computed by pgvector over the stored objective vectors.
   */
  async searchPastEvaluations(input: SearchJobEvaluationsInput): Promise<JobEvaluationEntity[]> {
    const embedding = await this.embeddings.embed(input.objective);
    const query = this.evaluations
      .createQueryBuilder('evaluation')
      .innerJoinAndSelect('evaluation.job', 'job')
      .where('evaluation.workflowId = :workflowId', { workflowId: input.workflowId })
      .andWhere('evaluation.state = :scored', { scored: 'scored' })
      .andWhere('evaluation.objectiveEmbedding IS NOT NULL');
    if (input.maxScore !== undefined) {
      query.andWhere('evaluation.score <= :maxScore', { maxScore: input.maxScore });
    }
    return query
      .orderBy(`evaluation."objectiveEmbedding"::${VECTOR} <=> CAST(:embedding AS ${VECTOR})`, 'ASC')
      .setParameter('embedding', `[${embedding.join(',')}]`)
      .limit(input.limit)
      .getMany();
  }
}
