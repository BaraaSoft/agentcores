import type { BlockerKind } from '@ahe/agent-core';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One time a platform put a gate in front of an account (CAPTCHA, rate limit, verification…).
 * The history is a learning signal: the reasoning layer reads challenge rates per platform
 * to adjust pacing and channel mix, so gates are hit less often.
 */
@Entity('account_challenges')
@Index(['accountId', 'createdAt'])
export class AccountChallengeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'varchar', length: 30 })
  kind: BlockerKind;

  /** What the gate said, as reported by the execution layer (credentials already redacted). */
  @Column({ type: 'text' })
  detail: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
