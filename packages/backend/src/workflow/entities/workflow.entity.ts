import type { WorkflowResources, WorkflowState } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StrategyEntity } from '../../governance/entities/strategy.entity';

/**
 * One machine's run of a Strategy. A Strategy can run on several machines at once, and each machine
 * has its own Workflow with its own resource envelope and lifecycle state. The work itself — Units,
 * Jobs, and Tasks — belongs to the Strategy, not to the Workflow.
 */
@Entity('workflows')
@Index(['strategyId', 'machineId'], { unique: true })
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  strategyId: string;

  @ManyToOne(() => StrategyEntity, (strategy) => strategy.workflows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategyId' })
  strategy: StrategyEntity;

  /** The machine this Workflow runs on, e.g. its hostname. One Workflow per machine per Strategy. */
  @Column({ type: 'varchar', length: 100 })
  machineId: string;

  @Column({ type: 'jsonb' })
  resources: WorkflowResources;

  @Column({ type: 'varchar', length: 20, default: 'paused' })
  state: WorkflowState;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
