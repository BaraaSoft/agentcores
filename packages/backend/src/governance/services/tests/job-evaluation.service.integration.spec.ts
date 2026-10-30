import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { describeWithDatabase } from '../../../database/tests/test-database.config';
import { TestDatabaseModule } from '../../../database/tests/test-database.module';
import { EmbeddingClient } from '../../../embedding/embedding.client';
import { EMBEDDING_DIMENSIONS } from '../../../embedding/embedding.constants';
import { JobEvaluationEntity } from '../../entities/job-evaluation.entity';
import { JobEvaluationService } from '../job-evaluation.service';
import { GOVERNANCE_ENTITIES, GovernanceSeeder } from './governance-seeder';

const OWNER = 'owner-1';

/**
 * Embeds by direction rather than by meaning: each text is placed at a fixed angle, so texts at
 * nearby angles come out close and the suite can assert on the ordering the real model would give.
 */
const ANGLES: Record<string, number> = {
  'Introduce a product to a small online community through a text post': 0,
  'Share a product announcement in a niche discussion forum': 0.3,
  'Reply to comments on an existing community thread': 1.0,
  'Produce a mechanical part design and export it for manufacture': 3.0,
};

class AngleEmbeddingClient extends EmbeddingClient {
  async embed(text: string): Promise<number[]> {
    const angle = ANGLES[text];
    if (angle === undefined) throw new Error(`No angle for "${text}"`);
    const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    vector[0] = Math.cos(angle);
    vector[1] = Math.sin(angle);
    return vector;
  }
}

describeWithDatabase('JobEvaluationService (Postgres)', () => {
  let moduleRef: TestingModule;
  let dataSource: DataSource;
  let seeder: GovernanceSeeder;
  let service: JobEvaluationService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestDatabaseModule.register({ schema: 'job_evaluation_service_spec', entities: GOVERNANCE_ENTITIES })],
      providers: [JobEvaluationService, GovernanceSeeder, { provide: EmbeddingClient, useClass: AngleEmbeddingClient }],
    }).compile();
    dataSource = moduleRef.get(DataSource);
    seeder = moduleRef.get(GovernanceSeeder);
    service = moduleRef.get(JobEvaluationService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await seeder.clear();
  });

  const reload = (evaluationId: string) => dataSource.getRepository(JobEvaluationEntity).findOneByOrFail({ id: evaluationId });

  /** One owner's Strategy with a Job under it, ready to be judged. */
  async function openEvaluation(jobName = 'Engage r/AICompanion') {
    const { strategy } = await seeder.strategyWithWorkflow();
    const unit = await seeder.unit(strategy.id, 'Community engagement');
    const job = await seeder.job(unit.id, jobName);
    const evaluation = await service.createEvaluation({
      owner: OWNER,
      jobId: job.id,
      unitOfWorkId: unit.id,
    });
    return { unit, job, evaluation };
  }

  function score(evaluationId: string, objectiveSummary: string, scoreOutOfTen = 4) {
    return service.recordScore({
      evaluationId,
      score: scoreOutOfTen,
      objectiveSummary,
      whatGood: 'Led with a question.',
      whatBad: 'Posted at 3am.',
      rubric: 'Judged on upvotes.',
    });
  }

  describe('createEvaluation', () => {
    it('opens an evaluation in the evaluating state', async () => {
      const { evaluation } = await openEvaluation();

      expect(evaluation).toMatchObject({ state: 'evaluating', score: null, attempts: 0, evidenceJobId: null });
    });

    it('returns the judgement already opened rather than a second one: a Job is judged once', async () => {
      const { unit, job, evaluation } = await openEvaluation();

      const again = await service.createEvaluation({ owner: OWNER, jobId: job.id, unitOfWorkId: unit.id });

      expect(again.id).toBe(evaluation.id);
      expect(await dataSource.getRepository(JobEvaluationEntity).count()).toBe(1);
    });
  });

  describe('listScoredByJob', () => {
    it('returns the scored judgements of the given Units, keyed by Job', async () => {
      const { unit, job, evaluation } = await openEvaluation('Post an intro');
      await score(evaluation.id, 'Reply to comments on an existing community thread', 6);
      const unscored = await seeder.job(unit.id, 'Not scored yet');
      await service.createEvaluation({ owner: OWNER, jobId: unscored.id, unitOfWorkId: unit.id });

      const marks = await service.listScoredByJob([unit.id]);

      expect([...marks.keys()]).toEqual([job.id]);
      expect(marks.get(job.id)).toMatchObject({ score: 6 });
      expect(await service.listScoredByJob([])).toEqual(new Map());
    });
  });

  describe('listEvaluationsByJob', () => {
    it('returns the evaluations of the given Units in every state, keyed by Job', async () => {
      const { unit, job, evaluation } = await openEvaluation('Post an intro');
      await score(evaluation.id, 'Reply to comments on an existing community thread', 6);
      const unscored = await seeder.job(unit.id, 'Not scored yet');
      await service.createEvaluation({ owner: OWNER, jobId: unscored.id, unitOfWorkId: unit.id });

      const evaluations = await service.listEvaluationsByJob([unit.id]);

      expect(evaluations.get(job.id)).toMatchObject({ state: 'scored', score: 6 });
      expect(evaluations.get(unscored.id)).toMatchObject({ state: 'evaluating', score: null });
      expect(await service.listEvaluationsByJob([])).toEqual(new Map());
    });
  });

  describe('the states a judgement moves through', () => {
    it('records the score, the feedback, and the objective vector', async () => {
      const { evaluation } = await openEvaluation();

      expect(await score(evaluation.id, 'Reply to comments on an existing community thread')).toBe(true);

      const stored = await reload(evaluation.id);
      expect(stored).toMatchObject({
        state: 'scored',
        score: 4,
        objectiveSummary: 'Reply to comments on an existing community thread',
        whatGood: 'Led with a question.',
        whatBad: 'Posted at 3am.',
      });
      expect(stored.objectiveEmbedding).toHaveLength(EMBEDDING_DIMENSIONS);
    });

    it('does not score a judgement twice', async () => {
      const { evaluation } = await openEvaluation();
      await score(evaluation.id, 'Reply to comments on an existing community thread', 4);

      expect(await score(evaluation.id, 'Reply to comments on an existing community thread', 9)).toBe(false);
      expect((await reload(evaluation.id)).score).toBe(4);
    });

    it('parks on an evidence Job, wakes again, and can then be scored', async () => {
      const { evaluation } = await openEvaluation();
      const evidenceJob = await seeder.job((await reload(evaluation.id)).unitOfWorkId, 'Read the upvotes');

      expect(await service.parkForEvidence(evaluation.id, evidenceJob.id)).toBe(true);
      expect(await reload(evaluation.id)).toMatchObject({ state: 'awaiting_evidence', evidenceJobId: evidenceJob.id });

      expect(await service.findEvaluationAwaiting(evidenceJob.id)).toMatchObject({ id: evaluation.id });
      expect(await service.resumeFromEvidence(evaluation.id)).toBe(true);
      expect(await score(evaluation.id, 'Reply to comments on an existing community thread')).toBe(true);
    });

    it('will not park a judgement that has already settled', async () => {
      const { evaluation } = await openEvaluation();
      await score(evaluation.id, 'Reply to comments on an existing community thread');

      expect(await service.parkForEvidence(evaluation.id, evaluation.jobId)).toBe(false);
    });

    it('counts attempts one at a time', async () => {
      const { evaluation } = await openEvaluation();

      expect(await service.recordJudgingAttempt(evaluation.id)).toBe(1);
      expect(await service.recordJudgingAttempt(evaluation.id)).toBe(2);
    });

    it('records why a judgement was given up on', async () => {
      const { evaluation } = await openEvaluation();

      expect(await service.failEvaluation(evaluation.id, 'judging threw 3 times')).toBe(true);
      expect(await reload(evaluation.id)).toMatchObject({ state: 'failed', rubric: 'Not judged: judging threw 3 times' });
    });
  });

  describe('searchPastEvaluations', () => {
    /** Three scored Jobs of one owner, at increasing distance from the forum-post objective. */
    async function scoredJobs() {
      const { unit } = await openEvaluation('Post an intro');
      const summaries = [
        'Introduce a product to a small online community through a text post',
        'Reply to comments on an existing community thread',
        'Produce a mechanical part design and export it for manufacture',
      ];
      for (const [index, objectiveSummary] of summaries.entries()) {
        const job = await seeder.job(unit.id, `Job ${index}`);
        const evaluation = await service.createEvaluation({
          owner: OWNER,
          jobId: job.id,
          unitOfWorkId: unit.id,
        });
        await score(evaluation.id, objectiveSummary, index + 2);
      }
      return { unit };
    }

    it('returns the closest objectives first', async () => {
      await scoredJobs();

      const found = await service.searchPastEvaluations({
        owner: OWNER,
        objective: 'Share a product announcement in a niche discussion forum',
        limit: 3,
      });

      expect(found.map((evaluation) => evaluation.objectiveSummary)).toEqual([
        'Introduce a product to a small online community through a text post',
        'Reply to comments on an existing community thread',
        'Produce a mechanical part design and export it for manufacture',
      ]);
    });

    it('returns at most the limit asked for', async () => {
      await scoredJobs();

      const found = await service.searchPastEvaluations({
        owner: OWNER,
        objective: 'Share a product announcement in a niche discussion forum',
        limit: 1,
      });

      expect(found).toHaveLength(1);
      expect(found[0].objectiveSummary).toBe('Introduce a product to a small online community through a text post');
    });

    it('narrows to the Jobs that went badly when asked for a ceiling', async () => {
      await scoredJobs();

      const found = await service.searchPastEvaluations({
        owner: OWNER,
        objective: 'Share a product announcement in a niche discussion forum',
        limit: 3,
        maxScore: 2,
      });

      expect(found.map((evaluation) => evaluation.score)).toEqual([2]);
    });

    it('never crosses into another owner\u2019s work', async () => {
      await scoredJobs();
      await seeder.strategyWithWorkflow('owner-2');

      const found = await service.searchPastEvaluations({
        owner: 'owner-2',
        objective: 'Share a product announcement in a niche discussion forum',
        limit: 3,
      });

      expect(found).toEqual([]);
    });

    it('learns from the owner\u2019s earlier Strategies too', async () => {
      await scoredJobs();
      await seeder.strategyWithWorkflow();

      const found = await service.searchPastEvaluations({
        owner: OWNER,
        objective: 'Share a product announcement in a niche discussion forum',
        limit: 1,
      });

      expect(found[0].objectiveSummary).toBe('Introduce a product to a small online community through a text post');
    });

    it('skips judgements that were never scored', async () => {
      await openEvaluation();

      const found = await service.searchPastEvaluations({
        owner: OWNER,
        objective: 'Share a product announcement in a niche discussion forum',
        limit: 3,
      });

      expect(found).toEqual([]);
    });
  });
});
