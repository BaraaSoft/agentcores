import type { Metric } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { JobEntity } from './job.entity';
import { StrategyEntity } from './strategy.entity';

/**
 * A theme of related Jobs inside a Strategy, with its own success criteria
 * and a share of the Strategy's effort.
 */
@Entity('units_of_work')
export class UnitOfWorkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  strategyId: string;

  @ManyToOne(() => StrategyEntity, (strategy) => strategy.unitsOfWork, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategyId' })
  strategy: StrategyEntity;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'jsonb' })
  successCriteria: Metric[];

  /** 0–100. Active Units in one Strategy sum to 100. */
  @Column({ type: 'int' })
  allocationPercentage: number;

  /** Deprecated Units keep their history but get no new Jobs. */
  @Column({ type: 'boolean', default: false })
  isDeprecated: boolean;

  @OneToMany(() => JobEntity, (job) => job.unitOfWork)
  jobs: JobEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
