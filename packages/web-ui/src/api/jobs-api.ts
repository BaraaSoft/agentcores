import { apiUrl } from './http-client';

/**
 * The address of the Job's final screen, from the last Task in its sequence that saved one. `version` changes
 * when a Task finishes, so the browser loads the new screen instead of the one it holds.
 */
export function jobScreenshotUrl(jobId: string, version: string): string {
  return apiUrl(`/jobs/${jobId}/screenshot?v=${encodeURIComponent(version)}`);
}
