import type { UnitMeasurement } from '@agentcores/agent-core';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The owner's daily summary for one Workflow: what was done, how each Unit is
 * tracking against its criteria, and what is waiting on a human.
 */
@Entity('daily_reports')
@Index(['workflowId', 'reportDate'], { unique: true })
export class DailyReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column({ type: 'date' })
  reportDate: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'jsonb' })
  unitMeasurements: UnitMeasurement[];

  @Column({ type: 'int' })
  tasksCompleted: number;

  @Column({ type: 'int' })
  tasksFailed: number;

  @Column({ type: 'int' })
  openEscalations: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
