/**
 * Metric values collected for a Unit of Work, usually by a Task that checked engagement.
 */
export interface RecordReadingsInput {
  readonly unitOfWorkId: string;
  readonly taskId: string | null;
  readonly readings: Readonly<Record<string, number>>;
}
