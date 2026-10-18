import type { TaskResult, TaskStatus } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { JobEntity } from './job.entity';

/**
 * An atomic action run by the Task processor. `workflowId` is denormalised so the
 * orchestrator can find pending/running Tasks for a Workflow without joining up the tree.
 */
@Entity('tasks')
@Index(['workflowId', 'status'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column({ type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobEntity, (job) => job.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: JobEntity;

  @Column({ type: 'text' })
  action: string;

  /** Order within the Job; Tasks run in ascending sequence. */
  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: TaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  result: TaskResult | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
