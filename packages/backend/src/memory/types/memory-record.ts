import type { MemoryZone } from './memory-zone';

/**
 * One item fetched from HumanExperiences memory, before privacy filtering.
 * `zone` is optional on purpose: the filter treats a missing zone as sealed.
 */
export interface MemoryRecord {
  readonly id: string;
  readonly zone?: MemoryZone;
  /** e.g. `voice`, `philosophy`, `product`, `learning`. */
  readonly kind: string;
  readonly content: string;
}
