import { ApiError } from './api-error';

const API_PREFIX = '/api';

/** Reads JSON from a backend route, such as `/workflows`. Throws `ApiError` on a network or HTTP failure. */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, { headers: { Accept: 'application/json' } }).catch(() => {
    throw new ApiError('The agent backend cannot be reached.', null);
  });
  if (!response.ok) throw new ApiError(`GET ${path} answered ${response.status}.`, response.status);
  return (await response.json()) as T;
}
