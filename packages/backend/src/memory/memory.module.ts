import { Module } from '@nestjs/common';
import { HumanExperiencesMemoryClient } from './human-experiences-memory.client';
import { MemoryRetrievalService } from './memory-retrieval.service';
import { PrivacyFilterService } from './privacy-filter.service';

/**
 * Memory bridge to HumanExperiences. The raw client is deliberately not exported:
 * other modules can only reach memory through MemoryRetrievalService.
 */
@Module({
  providers: [HumanExperiencesMemoryClient, PrivacyFilterService, MemoryRetrievalService],
  exports: [MemoryRetrievalService, PrivacyFilterService],
})
export class MemoryModule {}
