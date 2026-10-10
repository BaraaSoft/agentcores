/**
 * A Unit of Work's metrics over a period, compared with its success criteria.
 * Produced daily; fed into the monthly Strategy evaluation.
 */
export interface UnitMeasurement {
  readonly unitOfWorkId: string;
  readonly unitName: string;
  /** Aggregated value per metric key for the period. */
  readonly values: Readonly<Record<string, number>>;
  readonly isMeetingCriteria: boolean;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}
