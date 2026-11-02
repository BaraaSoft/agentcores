import type { GoldStandards, StrategyEvaluation, StrategyWorkType } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WorkflowEntity } from '../../workflow/entities/workflow.entity';
import { UnitOfWorkEntity } from './unit-of-work.entity';

/**
 * What one owner wants done, and how the work repeats — a reusable goal, and the root of governance:
 * Strategy → Workflow (one run) → Unit of Work → Job → Task. A Strategy never finishes itself: each
 * run is a Workflow that ends `done`, and running the Strategy again starts a new Workflow that plans
 * with what the earlier runs learned.
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

  /** The outcome the owner wants, in their words. Every Unit is planned against it. */
  @Column({ type: 'text' })
  objective: string;

  @Column({ type: 'varchar', length: 20 })
  workType: StrategyWorkType;

  /** How many versions a `multi_version` Strategy makes; null for the other work types. */
  @Column({ type: 'int', nullable: true })
  versionCount: number | null;

  /** Most attempts a `one_off` Strategy makes before it stops. */
  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  /** For the Strategy review, which is not built yet. */
  @Column({ type: 'jsonb', nullable: true })
  goldStandards: GoldStandards | null;

  /** Null until the Strategy has been reviewed. */
  @Column({ type: 'jsonb', nullable: true })
  evaluation: StrategyEvaluation | null;

  @OneToMany(() => UnitOfWorkEntity, (unit) => unit.strategy)
  unitsOfWork: UnitOfWorkEntity[];

  /** Every run of this Strategy, one Workflow each. */
  @OneToMany(() => WorkflowEntity, (workflow) => workflow.strategy)
  workflows: WorkflowEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
