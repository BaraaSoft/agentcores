/**
 * Request for owner context relevant to what the agent is about to do.
 */
export interface RetrieveSafeContextInput {
  readonly owner: string;
  /** What the context is for, e.g. the Task action — used to rank relevance. */
  readonly query: string;
  readonly limit: number;
}
