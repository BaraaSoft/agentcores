/** Where one launch step stands, with the backend's reason when it failed. */
export interface LaunchStepState {
  readonly status: 'waiting' | 'running' | 'done' | 'failed';
  readonly error: string | null;
}
