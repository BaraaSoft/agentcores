import type { JobOutcomeStatus } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TaskEntity } from './task.entity';
import { UnitOfWorkEntity } from './unit-of-work.entity';

/**
 * A set of related Tasks with one clear objective, tagged to a Unit of Work.
 * Open while `outcomeStatus` is null; the outcome is written once, when the Job closes.
 */
@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unitOfWorkId: string;

  @ManyToOne(() => UnitOfWorkEntity, (unit) => unit.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unitOfWorkId' })
  unitOfWork: UnitOfWorkEntity;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  objective: string;

  @OneToMany(() => TaskEntity, (task) => task.job)
  tasks: TaskEntity[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  outcomeStatus: JobOutcomeStatus | null;

  /** What was achieved, or why the Job stopped. */
  @Column({ type: 'text', nullable: true })
  outcomeSummary: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  /** Job reviews started since the last one that succeeded; caps a review that keeps failing. */
  @Column({ type: 'int', default: 0 })
  reviewingAttempts: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
