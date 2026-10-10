import { Injectable, NotImplementedException } from '@nestjs/common';
import type { MemoryRecord } from './types/memory-record';

/**
 * The privacy wall. Drops every record that is sealed, has no zone, or mentions
 * a sealed topic, before anything reaches agent context. Fails closed: when in doubt, drop.
 */
@Injectable()
export class PrivacyFilterService {
  /**
   * Returns only the records that are safe for the agent to see.
   */
  filterSafeRecords(records: readonly MemoryRecord[]): MemoryRecord[] {
    throw new NotImplementedException();
  }

  /**
   * True when a record must never be loaded: sealed zone, missing zone,
   * or content matching a sealed-topic term.
   */
  isSealed(record: MemoryRecord): boolean {
    throw new NotImplementedException();
  }

  /**
   * True when text mentions a sealed topic. Also used to check outgoing content
   * (posts, replies) before the agent publishes it.
   */
  containsSealedTopic(text: string): boolean {
    throw new NotImplementedException();
  }
}
