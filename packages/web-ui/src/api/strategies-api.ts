import { getJson, postJson } from './http-client';
import type { CreateStrategyRequest } from './types/create-strategy-request';
import type { RunStrategyRequest } from './types/run-strategy-request';
import type { Strategy } from './types/strategy';
import type { WorkflowSummary } from './types/workflow-summary';

/** The Strategy routes of the backend. */
export const strategiesApi = {
  listStrategies: (): Promise<Strategy[]> => getJson('/strategies'),
  createStrategy: (request: CreateStrategyRequest): Promise<Strategy> => postJson('/strategies', request),
  /** Starts a fresh Workflow of the Strategy at attempt 1. The backend pauses the Workflow that runs on the machine now. */
  runStrategy: (strategyId: string, request: RunStrategyRequest): Promise<WorkflowSummary> =>
    postJson(`/strategies/${strategyId}/run`, request),
};
