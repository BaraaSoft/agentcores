import { Target } from 'lucide-react';
import type { WorkflowProgress } from '../../../api/types/workflow-progress';
import type { StatStripProps } from '../../../components/monitoring-components/stat-strip/stat-strip';
import { workTypeLine } from './work-type-line';

const MAX_SCORE = 10;

/** The figures above the board: the Strategy, then the attempt, the Jobs that run, the Tasks done, and the best score. */
export function boardStats(progress: WorkflowProgress): StatStripProps {
  const units = progress.unitsOfWork;
  const jobs = units.flatMap((unit) => unit.jobs);
  const tasks = jobs.flatMap((job) => job.tasks);
  const runningJobs = jobs.filter((job) => job.outcomeStatus === null && job.tasks.some((task) => task.status === 'running')).length;
  const doneTasks = tasks.filter((task) => task.status === 'complete').length;
  const scores = jobs.flatMap((job) => (job.evaluation?.state === 'scored' && job.evaluation.score !== null ? [job.evaluation.score] : []));
  const best = scores.length === 0 ? null : Math.max(...scores);
  const limit = progress.strategy.workType === 'one_off' ? progress.strategy.maxAttempts : progress.strategy.versionCount;
  const finishedUnits = units.filter((unit) => unit.status === 'complete').length;
  const unitsTotal = Math.max(limit ?? units.length, units.length);
  const currentLive = units.some((unit) => unit.status !== 'complete');
  return {
    hero: { icon: Target, label: 'Strategy', title: progress.strategy.name, meta: workTypeLine(progress.strategy) },
    metrics: [
      {
        label: 'Units of work',
        value: `${units.length}`,
        ...(limit === null ? {} : { total: `${limit}` }),
        visual: { kind: 'steps', done: finishedUnits, total: unitsTotal, currentLive },
      },
      {
        label: 'Jobs running',
        value: `${runningJobs}`,
        total: `${jobs.length}`,
        ...(runningJobs > 0 ? { tone: 'live' as const } : {}),
        visual: { kind: 'pulse', active: runningJobs > 0 },
      },
      { label: 'Tasks done', value: `${doneTasks}`, total: `${tasks.length}`, visual: { kind: 'ring', ratio: tasks.length === 0 ? 0 : doneTasks / tasks.length } },
      {
        label: 'Best score',
        value: best === null ? '—' : `${best}`,
        ...(best === null ? {} : { tone: 'scored' as const }),
        visual: { kind: 'meter', value: best, max: MAX_SCORE },
      },
    ],
  };
}
