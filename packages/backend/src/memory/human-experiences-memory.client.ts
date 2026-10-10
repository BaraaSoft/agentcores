import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MemoryRecord } from './types/memory-record';
import type { RecordLearningInput } from './types/record-learning-input';
import type { RetrieveSafeContextInput } from './types/retrieve-safe-context-input';

/**
 * HTTP bridge to the HumanExperiences memory system. Returns raw records —
 * callers must go through MemoryRetrievalService, which applies the privacy wall.
 */
@Injectable()
export class HumanExperiencesMemoryClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('HE_MEMORY_URL');
    this.apiKey = config.getOrThrow<string>('HE_MEMORY_API_KEY');
  }

  /**
   * Fetches memory records for an owner, ranked by relevance to the query.
   * Only requests the open zone; the privacy filter re-checks every record anyway.
   */
  async fetchRecords(input: RetrieveSafeContextInput): Promise<MemoryRecord[]> {
    throw new NotImplementedException();
  }

  /**
   * Stores an agent learning in HE memory, tagged as open-zone `learning`.
   */
  async saveLearning(input: RecordLearningInput): Promise<void> {
    throw new NotImplementedException();
  }
}
