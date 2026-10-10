/**
 * A new effort share for one Unit of Work, proposed during Strategy review.
 */
export interface UnitReallocation {
  readonly unitOfWorkId: string;
  readonly allocationPercentage: number;
}
