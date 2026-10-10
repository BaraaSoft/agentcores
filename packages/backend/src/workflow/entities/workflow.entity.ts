import type { WorkflowResources, WorkflowState } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StrategyEntity } from '../../governance/entities/strategy.entity';

/**
 * A persisted Workflow: who it acts for, its resource envelope, its lifecycle state,
 * and a pointer to the Strategy currently running.
 */
@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** HumanExperiences user ID. */
  @Column({ type: 'varchar', length: 100 })
  owner: string;

  @Column({ type: 'jsonb' })
  resources: WorkflowResources;

  @Column({ type: 'varchar', length: 20, default: 'paused' })
  state: WorkflowState;

  @Column({ type: 'uuid', nullable: true })
  activeStrategyId: string | null;

  @OneToMany(() => StrategyEntity, (strategy) => strategy.workflow)
  strategies: StrategyEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
