/**
 * Another Job of the same Unit of Work that has not closed yet. Job reasoning sees it so it leaves that Job's
 * work to it.
 */
export interface OpenSiblingJob {
  readonly name: string;
  readonly objective: string;
}
