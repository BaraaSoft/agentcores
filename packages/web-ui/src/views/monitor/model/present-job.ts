import { Briefcase } from 'lucide-react';
import { jobScreenshotUrl } from '../../../api/jobs-api';
import type { JobProgress } from '../../../api/types/job-progress';
import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';
import type { NodePresentation } from './node-presentation';

const FINISHED_TASKS = new Set(['complete', 'failed', 'cancelled']);

type JobStatus = { tone: StatusTone; badge: string };

/**
 * The badge of a closed Job, from its evaluation. Judging runs on while the run is paused, but a
 * judgement that waits for evidence waits for a Job, and Jobs do not run while paused.
 */
function closedJobStatus(job: JobProgress, isPaused: boolean): JobStatus {
  const evaluation = job.evaluation?.state ?? null;
  if (evaluation === 'evaluating') return { tone: 'judging', badge: 'Judging' };
  if (evaluation === 'awaiting_evidence') return isPaused ? { tone: 'waiting', badge: 'Paused' } : { tone: 'judging', badge: 'Judging' };
  if (job.outcomeStatus === 'failed') return { tone: 'failed', badge: 'Failed' };
  if (job.outcomeStatus === 'abandoned') return { tone: 'muted', badge: 'Abandoned' };
  return evaluation === 'failed' ? { tone: 'done', badge: 'Not scored' } : { tone: 'done', badge: 'Done' };
}

/**
 * The badge of an open Job, from its Tasks. A Task that needs the owner still does while paused;
 * otherwise a paused Job only moves to end the step that runs now.
 */
function openJobStatus(job: JobProgress, waitsForEarlierJob: boolean, isPaused: boolean): JobStatus {
  const has = (status: JobProgress['tasks'][number]['status']) => job.tasks.some((task) => task.status === status);
  if (has('escalated')) return { tone: 'judging', badge: 'Blocked' };
  if (isPaused) return has('running') ? { tone: 'live', badge: 'Pausing' } : { tone: 'waiting', badge: 'Paused' };
  if (has('running')) return { tone: 'live', badge: 'Running' };
  if (has('deferred')) return { tone: 'waiting', badge: 'Deferred' };
  if (has('pending')) return { tone: 'live', badge: 'Starting' };
  if (job.tasks.length === 0) return waitsForEarlierJob ? { tone: 'waiting', badge: 'Queued' } : { tone: 'live', badge: 'Planning' };
  return { tone: 'live', badge: 'Reviewing' };
}

/** When the Job's last Task finished, or null before any has. A Task saves its screenshot before it finishes. */
function lastFinishedAt(job: JobProgress): string | null {
  const finished = job.tasks.flatMap((task) => (task.completedAt === null ? [] : [task.completedAt]));
  return finished.length === 0 ? null : finished.reduce((latest, at) => (Date.parse(at) > Date.parse(latest) ? at : latest));
}

/** The tone and badge of a Job, from its outcome, its evaluation, its Tasks, and whether its Unit is paused. */
function jobStatus(job: JobProgress, waitsForEarlierJob: boolean, isPaused: boolean): JobStatus {
  return job.outcomeStatus === null ? openJobStatus(job, waitsForEarlierJob, isPaused) : closedJobStatus(job, isPaused);
}

/**
 * Maps a Job to its card. `waitsForEarlierJob` is true for an ordered Job whose turn has not come;
 * `isPaused` is true when its Unit of Work is paused.
 */
export function presentJob(job: JobProgress, waitsForEarlierJob: boolean, isPaused: boolean): NodePresentation {
  const status = jobStatus(job, waitsForEarlierJob, isPaused);
  const finished = job.tasks.filter((task) => FINISHED_TASKS.has(task.status)).length;
  const total = job.tasks.length;
  const score = job.evaluation?.state === 'scored' && job.evaluation.score !== null ? `Score ${job.evaluation.score}` : undefined;
  const evaluation = job.evaluation;
  const screenshotVersion = lastFinishedAt(job);
  const sections = [
    ...(screenshotVersion === null
      ? []
      : [{ heading: 'Screenshot', image: { src: jobScreenshotUrl(job.id, screenshotVersion), alt: `The final screen of ${job.name}` } }]),
    { heading: 'Objective', body: job.objective },
    ...(job.outcomeSummary === null ? [] : [{ heading: 'Outcome', body: job.outcomeSummary }]),
    ...(evaluation === null || evaluation.whatGood === '' ? [] : [{ heading: 'What was good', body: evaluation.whatGood }]),
    ...(evaluation === null || evaluation.whatBad === '' ? [] : [{ heading: 'What to improve', body: evaluation.whatBad }]),
    ...(evaluation === null || evaluation.rubric === '' ? [] : [{ heading: 'How it was marked', body: evaluation.rubric }]),
  ];
  return {
    icon: Briefcase,
    title: job.name,
    meta: [job.orderNumber === null ? null : `#${job.orderNumber}`, total === 0 ? 'no tasks yet' : `${finished}/${total} tasks`]
      .filter((part) => part !== null)
      .join(' · '),
    tone: status.tone,
    badge: status.badge,
    ...(score === undefined ? {} : { score }),
    progress: { done: finished, total },
    kindLabel: job.orderNumber === null ? 'Job' : `Job · step ${job.orderNumber}`,
    sections,
  };
}
