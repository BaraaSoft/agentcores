import type { GoldStandards, StrategyEvaluation } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import { UnitOfWorkEntity } from './unit-of-work.entity';

/**
 * A 30-day cycle of work for one owner, and the root of governance: Strategy → Unit of Work → Job →
 * Task. It can run on several machines at once, each through its own Workflow. Past Strategies are
 * kept as history so the reasoning layer can learn from earlier evaluations.
 */
@Entity('strategies')
@Index(['owner', 'startDate'])
export class StrategyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** HumanExperiences user ID of the person this Strategy acts for. */
  @Column({ type: 'varchar', length: 100 })
  owner: string;

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

  /** The machines running this Strategy, one Workflow each. */
  @OneToMany(() => WorkflowEntity, (workflow) => workflow.strategy)
  workflows: WorkflowEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
