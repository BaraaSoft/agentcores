import { Module } from '@nestjs/common';
import { ReasoningModelClient } from './reasoning-model.client';
import { ReasoningService } from './reasoning.service';

/**
 * The reasoning layer (Opus). A leaf module: other modules call it, it calls no one.
 */
@Module({
  providers: [ReasoningModelClient, ReasoningService],
  exports: [ReasoningService],
})
export class ReasoningModule {}
