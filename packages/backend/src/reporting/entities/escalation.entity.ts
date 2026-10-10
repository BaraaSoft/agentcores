import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { EscalationStatus } from '../types/escalation-status';

/**
 * A decision the agent was not allowed to make alone (spend, risk, tone),
 * parked until the owner answers.
 */
@Entity('escalations')
@Index(['workflowId', 'status'])
export class EscalationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  /** What the agent wants to do and why it needs a human. */
  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: EscalationStatus;

  @Column({ type: 'text', nullable: true })
  ownerNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
