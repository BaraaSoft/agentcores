import { Briefcase } from 'lucide-react';
import type { JobProgress } from '../../../api/types/job-progress';
import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';
import type { NodePresentation } from './node-presentation';

const FINISHED_TASKS = new Set(['complete', 'failed', 'cancelled']);

/** The tone and badge of a Job, from its outcome, its evaluation, and its Tasks. */
function jobStatus(job: JobProgress, waitsForEarlierJob: boolean): { tone: StatusTone; badge: string } {
  const judging = job.evaluation !== null && (job.evaluation.state === 'evaluating' || job.evaluation.state === 'awaiting_evidence');
  if (job.outcomeStatus === 'failed') return { tone: 'failed', badge: 'Failed' };
  if (job.outcomeStatus === 'abandoned') return { tone: 'muted', badge: 'Abandoned' };
  if (job.outcomeStatus === 'success') return judging ? { tone: 'judging', badge: 'Judging' } : { tone: 'done', badge: 'Done' };
  if (job.tasks.some((task) => task.status === 'running')) return { tone: 'live', badge: 'Running' };
  if (job.tasks.some((task) => task.status === 'escalated')) return { tone: 'judging', badge: 'Blocked' };
  if (job.tasks.length === 0) return waitsForEarlierJob ? { tone: 'waiting', badge: 'Queued' } : { tone: 'live', badge: 'Planning' };
  return { tone: 'live', badge: 'Reviewing' };
}

/** Maps a Job to its card. `waitsForEarlierJob` is true for an ordered Job whose turn has not come. */
export function presentJob(job: JobProgress, waitsForEarlierJob: boolean): NodePresentation {
  const status = jobStatus(job, waitsForEarlierJob);
  const finished = job.tasks.filter((task) => FINISHED_TASKS.has(task.status)).length;
  const total = job.tasks.length;
  const score = job.evaluation?.state === 'scored' && job.evaluation.score !== null ? `Score ${job.evaluation.score}` : undefined;
  const evaluation = job.evaluation;
  const sections = [
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
