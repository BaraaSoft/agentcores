/**
 * What a finished Task leaves behind: the compressed summary the reasoning
 * layer saw, plus any metric readings the Task collected (e.g. engagement checks).
 */
export interface TaskResult {
  readonly summary: string;
  readonly metricReadings: Readonly<Record<string, number>>;
  /** Execution steps the Task ran. Absent on Tasks finished before it was recorded. */
  readonly steps?: number;
  /** Model turns on screen, summed over every step. Absent on Tasks finished before it was recorded. */
  readonly screenTurns?: number;
  readonly completedAt: Date;
}
