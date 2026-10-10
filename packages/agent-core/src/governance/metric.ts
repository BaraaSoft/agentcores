/**
 * A measurable target, used both for Unit of Work success criteria
 * (views, likes, engagement) and Strategy gold standards (subscribers, paying customers).
 */
export interface Metric {
  /** Stable machine key, e.g. `reddit_upvotes` or `he_signups`. */
  readonly key: string;
  readonly label: string;
  /** Value that counts as success for the measurement period. */
  readonly target: number;
}
