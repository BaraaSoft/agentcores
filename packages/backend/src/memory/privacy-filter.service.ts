import { Injectable } from '@nestjs/common';
import type { MemoryRecord } from './types/memory-record';

/**
 * The privacy wall. Drops every record that is sealed, has no zone, or mentions
 * a sealed topic, before anything reaches agent context. Fails closed: when in doubt, drop.
 *
 * TODO: not built. Records are always dropped, which is safe because memory returns none yet. No
 * sealed-topic terms exist yet, so outgoing text is never refused.
 */
@Injectable()
export class PrivacyFilterService {
  /**
   * Returns only the records that are safe for the agent to see.
   *
   * TODO: drops every record until the wall is built.
   */
  filterSafeRecords(_records: readonly MemoryRecord[]): MemoryRecord[] {
    return [];
  }

  /**
   * True when a record must never be loaded: sealed zone, missing zone,
   * or content matching a sealed-topic term.
   *
   * TODO: treats every record as sealed until the wall is built.
   */
  isSealed(_record: MemoryRecord): boolean {
    return true;
  }

  /**
   * True when text mentions a sealed topic. Also used to check outgoing content
   * (posts, replies) before the agent publishes it.
   *
   * TODO: always false until sealed-topic terms exist.
   */
  containsSealedTopic(_text: string): boolean {
    return false;
  }
}
