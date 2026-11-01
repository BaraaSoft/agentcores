/** One Task of a Job, as `GET /workflows/:id/progress` returns it. */
export interface TaskProgress {
  readonly id: string;
  readonly sequence: number;
  readonly action: string;
  readonly skillType: 'general' | 'creative_design' | 'social_post';
  readonly status: 'pending' | 'running' | 'complete' | 'failed' | 'escalated' | 'deferred' | 'cancelled';
  readonly summary: string | null;
  readonly failureReason: string | null;
  readonly locationPath: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}
