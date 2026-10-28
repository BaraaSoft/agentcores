import type { JobEvaluationState } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { JobEntity } from './job.entity';

/**
 * One day's judgement of one Job: a score out of 10 and precise feedback on what was good and what
 * was not. A Job is judged again on a later day when it sees new activity — engagement arrives long
 * after a post goes up — so there is one row per Job per day, not one per Job.
 *
 * These rows are the agent's memory of its own work: the planner searches them by objective before
 * planning a new Job, so it can avoid what went badly and repeat what went well.
 */
@Entity('job_evaluations')
@Index(['jobId', 'evaluationDate'], { unique: true })
@Index(['owner', 'state'])
export class JobEvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Denormalised from the Job's Strategy so the search for past Jobs stays inside one owner's work:
   * what the agent learnt for one owner must never leak into another's planning. It is the owner, not
   * the Strategy, so a new 30-day cycle still learns from the cycles before it.
   */
  @Column({ type: 'varchar', length: 100 })
  owner: string;

  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: JobEntity;

  @Column({ type: 'uuid' })
  unitOfWorkId: string;

  /** The day being judged, as a calendar date; the Job may be judged again on later days. */
  @Column({ type: 'date' })
  evaluationDate: string;

  @Column({ type: 'varchar', length: 20, default: 'judging' })
  state: JobEvaluationState;

  /** 1–10 against the objective; null until the judgement is settled. */
  @Column({ type: 'int', nullable: true })
  score: number | null;

  /**
   * The Job's objective in general terms — the kind of work, the medium, and the intent, with
   * one-off specifics left out — so a future Job with a similar objective matches it.
   */
  @Column({ type: 'text', default: '' })
  objectiveSummary: string;

  /**
   * The `objectiveSummary` as a vector, for finding past Jobs by meaning. Stored as a float array
   * and cast to pgvector in the query, so the distance operator does the work in Postgres.
   * Only the objective is embedded: including the feedback would match a Job whose failure text
   * happens to mention the same place.
   */
  @Column({ type: 'real', array: true, nullable: true })
  objectiveEmbedding: number[] | null;

  /** What worked and is worth repeating. Written as advice to whoever plans the next Job like this. */
  @Column({ type: 'text', default: '' })
  whatGood: string;

  /** What went wrong and should not be repeated, in the same voice. */
  @Column({ type: 'text', default: '' })
  whatBad: string;

  /** How the Job was judged: the standard it was held to and where the evidence came from. */
  @Column({ type: 'text', default: '' })
  rubric: string;

  /**
   * The Job spun up to go and measure the real-world outcome, when the evidence was not already in
   * hand. It also keeps the evaluator off its own tail: a Job that exists to serve an evaluation is
   * never itself evaluated.
   */
  @Column({ type: 'uuid', nullable: true })
  evidenceJobId: string | null;

  /** Judgement attempts so far; caps a judgement that keeps throwing. */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
