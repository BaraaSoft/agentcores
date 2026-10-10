import type { GoldStandards, StrategyEvaluation } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import { UnitOfWorkEntity } from './unit-of-work.entity';

/**
 * A 30-day cycle belonging to a Workflow. Past Strategies are kept as history
 * so the reasoning layer can learn from earlier evaluations.
 */
@Entity('strategies')
export class StrategyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.strategies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: WorkflowEntity;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column({ type: 'jsonb' })
  goldStandards: GoldStandards;

  /** Null until the cycle has been graded. */
  @Column({ type: 'jsonb', nullable: true })
  evaluation: StrategyEvaluation | null;

  @OneToMany(() => UnitOfWorkEntity, (unit) => unit.strategy)
  unitsOfWork: UnitOfWorkEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
