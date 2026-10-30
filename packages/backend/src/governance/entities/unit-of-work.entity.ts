import type { UnitOfWorkState, UnitOfWorkStatus } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JobEntity } from './job.entity';
import { StrategyEntity } from './strategy.entity';

/**
 * One round, attempt, or version of a Strategy's work: a group of Jobs and nothing more. Only the
 * orchestrator creates one, when its Strategy has no open Unit, and only the orchestrator moves its
 * `status` on.
 */
@Entity('units_of_work')
@Index(['strategyId', 'sequence'], { unique: true })
export class UnitOfWorkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  strategyId: string;

  @ManyToOne(() => StrategyEntity, (strategy) => strategy.unitsOfWork, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategyId' })
  strategy: StrategyEntity;

  /** 1 for the Strategy's first Unit, then 2, 3, … Unique per Strategy, so two passes cannot both open the same Unit. */
  @Column({ type: 'int' })
  sequence: number;

  /** e.g. "Round 3", "Attempt 2", "Version 1". */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** The idea this Unit of Work tests, written by the planner, e.g. "Shorter hook, post at 9am". */
  @Column({ type: 'varchar', length: 200, default: '' })
  title: string;

  /** Why the planner chose that idea, given what the earlier Units of Work taught. */
  @Column({ type: 'text', default: '' })
  rationale: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: UnitOfWorkStatus;

  /** When its Jobs may be evaluated; set when the last Job closes. */
  @Column({ type: 'timestamptz', nullable: true })
  evaluateAfter: Date | null;

  /** Only a `running` Unit's Jobs and Tasks are carried out; a `paused` Unit's queued work is skipped. */
  @Column({ type: 'varchar', length: 20, default: 'running' })
  state: UnitOfWorkState;

  @OneToMany(() => JobEntity, (job) => job.unitOfWork)
  jobs: JobEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
