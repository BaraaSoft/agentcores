import type { TaskResult, TaskSkillType, TaskStatus } from '@agentcores/agent-core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { JobEntity } from './job.entity';

/**
 * An atomic action run by the Task processor. `workflowId` records the machine that runs it, since
 * one Strategy can run on several machines, and lets the orchestrator find a machine's pending and
 * running Tasks without joining up the tree.
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

  /** The kind of work, chosen by Job reasoning; picks the skill Task reasoning plans with. */
  @Column({ type: 'varchar', length: 30, default: 'general' })
  skillType: TaskSkillType;

  /** Order within the Job; Tasks run in ascending sequence. */
  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: TaskStatus;

  @Column({ type: 'jsonb', nullable: true })
  result: TaskResult | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  /** Where the Task was performed (a permalink, a file path, or an app), as the execution layer reported it on completion. */
  @Column({ type: 'text', nullable: true })
  locationPath: string | null;

  /** Brief steps to reach that view in software with no address; null for web pages and files. */
  @Column({ type: 'text', nullable: true })
  locationDetails: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /** When Job reasoning reviewed this finished Task; the Job waits while a finished Task is unreviewed. */
  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
