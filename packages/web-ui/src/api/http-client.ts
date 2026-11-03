import { ApiError } from './api-error';

const API_PREFIX = '/api';

/** The browser address of a backend route, for an element that loads it itself, such as an `<img>`. */
export function apiUrl(path: string): string {
  return `${API_PREFIX}${path}`;
}

/** The readable reason in a backend error body. Validation errors list one message per field. */
async function errorReason(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = body?.message;
  if (Array.isArray(message)) return message.join('; ');
  return typeof message === 'string' ? message : null;
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch(() => {
    throw new ApiError('The agent backend cannot be reached.', null);
  });
  if (!response.ok) {
    const reason = await errorReason(response);
    throw new ApiError(reason ?? `${method} ${path} answered ${response.status}.`, response.status);
  }
  return (await response.json()) as T;
}

/** Reads JSON from a backend route, such as `/workflows`. Throws `ApiError` on a network or HTTP failure. */
export function getJson<T>(path: string): Promise<T> {
  return request('GET', path);
}

/** Sends a POST to a backend route, with an optional JSON body, and reads the JSON answer. Throws `ApiError` on failure. */
export function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request('POST', path, body);
}
