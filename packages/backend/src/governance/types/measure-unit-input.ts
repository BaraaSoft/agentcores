/**
 * Measures one Unit of Work over a time window.
 */
export interface MeasureUnitInput {
  readonly unitOfWorkId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}
