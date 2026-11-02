import { postJson } from './http-client';
import type { CreateStrategyRequest } from './types/create-strategy-request';
import type { Strategy } from './types/strategy';

/** The Strategy routes of the backend. */
export const strategiesApi = {
  createStrategy: (request: CreateStrategyRequest): Promise<Strategy> => postJson('/strategies', request),
};
