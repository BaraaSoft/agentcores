/**
 * A Job the reasoning layer proposes. `unitName` says which Unit of Work it belongs to;
 * governance decides whether that maps to an existing Unit or needs a new one.
 */
export interface PlannedJob {
  readonly name: string;
  readonly objective: string;
  readonly unitName: string;
}
