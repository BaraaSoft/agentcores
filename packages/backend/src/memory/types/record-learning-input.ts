/**
 * Something the agent learned while acting (e.g. "short posts do better on r/AICompanion"),
 * to persist so future sessions can use it.
 */
export interface RecordLearningInput {
  readonly owner: string;
  readonly workflowId: string;
  readonly content: string;
}
