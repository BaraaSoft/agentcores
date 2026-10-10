/**
 * Data for a new Job. A Job always belongs to a Unit of Work.
 */
export interface CreateJobInput {
  readonly unitOfWorkId: string;
  readonly name: string;
  readonly objective: string;
}
