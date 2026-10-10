import { Injectable, NotImplementedException } from '@nestjs/common';
import { HumanExperiencesMemoryClient } from './human-experiences-memory.client';
import { PrivacyFilterService } from './privacy-filter.service';
import type { RecordLearningInput } from './types/record-learning-input';
import type { RetrieveSafeContextInput } from './types/retrieve-safe-context-input';
import type { SafeContext } from './types/safe-context';

/**
 * The only way the rest of AHE reads or writes memory. Every read passes the
 * privacy wall, so sealed data never enters a prompt in the first place.
 */
@Injectable()
export class MemoryRetrievalService {
  constructor(
    private readonly memoryClient: HumanExperiencesMemoryClient,
    private readonly privacyFilter: PrivacyFilterService,
  ) {}

  /**
   * Fetches owner context relevant to the query, filters it, and renders a prompt block.
   */
  async retrieveSafeContext(input: RetrieveSafeContextInput): Promise<SafeContext> {
    throw new NotImplementedException();
  }

  /**
   * Persists a learning so it carries over to future sessions.
   * Rejects learnings that mention a sealed topic.
   */
  async recordLearning(input: RecordLearningInput): Promise<void> {
    throw new NotImplementedException();
  }
}
