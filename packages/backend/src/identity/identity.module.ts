import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountChallengeEntity } from './entities/account-challenge.entity';
import { PlatformAccountEntity } from './entities/platform-account.entity';
import { IdentityService } from './identity.service';

/**
 * Platform accounts, their credentials, and the challenge history the agent learns pacing from.
 * A leaf module: only task execution uses it.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PlatformAccountEntity, AccountChallengeEntity])],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
