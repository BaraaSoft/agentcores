import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { PlatformAccountStatus } from '../types/platform-account-status';

/**
 * An account on an external platform (Reddit, X, LinkedIn, …) that the owner set up and the agent acts as.
 * Accounts are registered by the owner, not created by the agent. The password itself is never stored
 * here — only `secretRef`, a pointer into the secret store.
 */
@Entity('platform_accounts')
@Index(['workflowId', 'platform'])
export class PlatformAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  /** Site domain the account belongs to, e.g. `reddit.com`. */
  @Column({ type: 'varchar', length: 100 })
  platform: string;

  @Column({ type: 'varchar', length: 200 })
  username: string;

  /** Key of the password in the secret store (e.g. a macOS Keychain item or AWS Secrets Manager id). */
  @Column({ type: 'varchar', length: 300 })
  secretRef: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: PlatformAccountStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
