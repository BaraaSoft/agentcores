/**
 * Whether a Unit of Work's Jobs may run.
 * - `running`: its Jobs are planned, reviewed, and their Tasks are carried out.
 * - `paused`: nothing of it runs. Queued work is skipped and runs again when it is queued after resume.
 */
export const UNIT_OF_WORK_STATES = ['running', 'paused'] as const;

export type UnitOfWorkState = (typeof UNIT_OF_WORK_STATES)[number];
