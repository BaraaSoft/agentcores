import type { WorkflowResources, WorkflowState } from '@agentcores/agent-core';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StrategyEntity } from '../../governance/entities/strategy.entity';

/**
 * One run of a Strategy on one machine, with its resource envelope and lifecycle state. A Strategy is
 * a reusable goal and can have many Workflows over time; each run owns its Units of Work, Jobs, and
 * Tasks. A `done` Workflow is final: running the Strategy again creates a new Workflow.
 */
@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  strategyId: string;

  @ManyToOne(() => StrategyEntity, (strategy) => strategy.workflows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategyId' })
  strategy: StrategyEntity;

  /** The machine this Workflow runs on, e.g. its hostname. A machine runs one Workflow at a time. */
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
