/**
 * The two path prefixes the backend owns on its port: the control API and the admin tools.
 * Everything else on the port belongs to the dashboard, so `main.ts` and the dashboard fallback read
 * this one list and cannot drift apart when a new backend route arrives.
 */
export const API_PREFIX = '/api' as const;
export const ADMIN_PREFIX = '/admin' as const;

const BACKEND_PREFIXES = [API_PREFIX, ADMIN_PREFIX] as const;

/** Whether the backend answers this path. Matches whole segments, so `/apifoo` stays the dashboard's. */
export function isBackendPath(path: string): boolean {
  return BACKEND_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
