import type { WorkflowProgress } from '../../../api/types/workflow-progress';
import type { StatStripProps } from '../../../components/monitoring-components/stat-strip/stat-strip';

/** The key figures above the board: the Strategy, the current Unit, the Jobs that run, the Tasks done, and the best score. */
export function boardStats(progress: WorkflowProgress): StatStripProps['items'] {
  const units = progress.unitsOfWork;
  const jobs = units.flatMap((unit) => unit.jobs);
  const tasks = jobs.flatMap((job) => job.tasks);
  const current = units.find((unit) => unit.status === 'open') ?? units[units.length - 1];
  const runningJobs = jobs.filter((job) => job.outcomeStatus === null && job.tasks.some((task) => task.status === 'running')).length;
  const scores = jobs.flatMap((job) => (job.evaluation?.state === 'scored' && job.evaluation.score !== null ? [job.evaluation.score] : []));
  const limit = progress.strategy.workType === 'one_off' ? progress.strategy.maxAttempts : progress.strategy.versionCount;
  return [
    { label: 'Strategy', value: progress.strategy.name },
    { label: 'Unit of work', value: current === undefined ? 'Not started' : limit === null ? current.name : `${current.name} of ${limit}` },
    { label: 'Jobs running', value: `${runningJobs} of ${jobs.length}`, ...(runningJobs > 0 ? { tone: 'live' as const } : {}) },
    { label: 'Tasks done', value: `${tasks.filter((task) => task.status === 'complete').length} of ${tasks.length}` },
    { label: 'Best score', value: scores.length === 0 ? '—' : `${Math.max(...scores)}`, ...(scores.length === 0 ? {} : { tone: 'scored' as const }) },
  ];
}
