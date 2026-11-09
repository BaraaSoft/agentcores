import { Injectable } from '@nestjs/common';
import { HumanExperiencesMemoryClient } from './human-experiences-memory.client';
import { PrivacyFilterService } from './privacy-filter.service';
import type { RecordLearningInput } from './types/record-learning-input';
import type { RetrieveSafeContextInput } from './types/retrieve-safe-context-input';
import type { SafeContext } from './types/safe-context';

/**
 * The only way the rest of AgentCores.AI reads or writes memory. Every read passes the
 * privacy wall, so sealed data never enters a prompt in the first place.
 *
 * TODO: not built. Reads return no context and writes are dropped, so the agent runs without owner
 * memory. Build it on `HumanExperiencesMemoryClient` and `PrivacyFilterService`.
 */
@Injectable()
export class MemoryRetrievalService {
  constructor(
    private readonly memoryClient: HumanExperiencesMemoryClient,
    private readonly privacyFilter: PrivacyFilterService,
  ) {}

  /**
   * Fetches owner context relevant to the query, filters it, and renders a prompt block.
   *
   * TODO: returns an empty context until memory is built.
   */
  async retrieveSafeContext(input: RetrieveSafeContextInput): Promise<SafeContext> {
    return { owner: input.owner, records: [], promptBlock: '' };
  }

  /**
   * Persists a learning so it carries over to future sessions.
   * Rejects learnings that mention a sealed topic.
   *
   * TODO: drops the learning until memory is built.
   */
  async recordLearning(_input: RecordLearningInput): Promise<void> {}
}
