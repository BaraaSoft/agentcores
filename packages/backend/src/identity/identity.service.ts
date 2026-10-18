import type { AccountCredentials } from '@ahe/agent-core';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountChallengeEntity } from './entities/account-challenge.entity';
import { PlatformAccountEntity } from './entities/platform-account.entity';
import type { CountChallengesInput } from './types/count-challenges-input';
import type { GetCredentialsInput } from './types/get-credentials-input';
import type { RecordChallengeInput } from './types/record-challenge-input';

/**
 * Owns the platform accounts the agent acts as: their logins and the gates platforms put in front of them.
 *
 * Credentials come from the secret store, are handed to the execution layer for a single Task,
 * and never pass through memory, the reasoning layer, logs, or the database.
 */
@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(PlatformAccountEntity)
    private readonly accounts: Repository<PlatformAccountEntity>,
    @InjectRepository(AccountChallengeEntity)
    private readonly challenges: Repository<AccountChallengeEntity>,
  ) {}

  /**
   * Returns the login for the workflow's active account on `platform`, or `null` when there is
   * no usable account (none registered, or it is waiting on the owner).
   */
  async getCredentials(input: GetCredentialsInput): Promise<AccountCredentials | null> {
    throw new NotImplementedException();
  }

  /**
   * Logs a gate against the account. Gates only the owner can clear (`verification_code`,
   * `identity_check`) move the account to `needs_owner`; `account_restricted` moves it to `restricted`.
   */
  async recordChallenge(input: RecordChallengeInput): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * How many gates the account hit since `input.since`. Task reasoning uses it to slow down, and
   * Unit of Work reviews use it to move effort to another channel, before a platform escalates further.
   */
  async countRecentChallenges(input: CountChallengesInput): Promise<number> {
    throw new NotImplementedException();
  }

  /**
   * Reads a password from the secret store by its reference.
   */
  private async readSecret(secretRef: string): Promise<string> {
    throw new NotImplementedException();
  }
}
