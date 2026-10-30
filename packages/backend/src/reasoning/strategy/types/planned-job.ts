import type { JobOrderType } from '@ahe/agent-core';

/**
 * A Job the planner proposes for a new Unit of Work. An `ordered` Job waits for the ordered Jobs listed
 * before it; the orchestrator numbers them in the order the planner wrote them.
 */
export interface PlannedJob {
  readonly name: string;
  readonly objective: string;
  readonly orderType: JobOrderType;
}
