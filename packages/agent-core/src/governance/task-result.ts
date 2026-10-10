/**
 * What a finished Task leaves behind: the compressed summary the reasoning
 * layer saw, plus any metric readings the Task collected (e.g. engagement checks).
 */
export interface TaskResult {
  readonly summary: string;
  readonly metricReadings: Readonly<Record<string, number>>;
  readonly completedAt: Date;
}
