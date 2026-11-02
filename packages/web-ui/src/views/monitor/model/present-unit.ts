import { Layers } from 'lucide-react';
import type { UnitOfWorkProgress } from '../../../api/types/unit-of-work-progress';
import type { StatusTone } from '../../../components/monitoring-components/types/status-tone';
import type { NodePresentation } from './node-presentation';

/** The mean score of the Unit's marked Jobs, such as "Score 7.5", or undefined when none is marked. */
function meanScore(unit: UnitOfWorkProgress): string | undefined {
  const scores = unit.jobs.flatMap((job) => (job.evaluation?.state === 'scored' && job.evaluation.score !== null ? [job.evaluation.score] : []));
  if (scores.length === 0) return undefined;
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return `Score ${Number.isInteger(mean) ? mean : mean.toFixed(1)}`;
}

type UnitStatus = { tone: StatusTone; badge: string };

/**
 * The badge of a Unit while its run is paused. Open work stops after the step that runs now; judging
 * that already began goes on, but no new judging starts.
 */
function pausedUnitStatus(unit: UnitOfWorkProgress, hasLiveWork: boolean): UnitStatus {
  if (unit.status === 'open') return hasLiveWork ? { tone: 'live', badge: 'Pausing' } : { tone: 'waiting', badge: 'Paused' };
  const isJudging = unit.jobs.some((job) => job.evaluation?.state === 'evaluating');
  return isJudging ? { tone: 'judging', badge: 'Judging' } : { tone: 'waiting', badge: 'Paused' };
}

/**
 * Maps a Unit of Work to its card. `hasLiveWork` is true when one of its Jobs runs now; in a paused
 * Unit, that is a Task that ends its current step before the pause takes hold.
 */
export function presentUnit(unit: UnitOfWorkProgress, hasLiveWork: boolean): NodePresentation {
  const closed = unit.jobs.filter((job) => job.outcomeStatus !== null).length;
  const statuses: Record<UnitOfWorkProgress['status'], UnitStatus> = {
    open: hasLiveWork ? { tone: 'live', badge: 'Active' } : { tone: 'waiting', badge: 'Open' },
    evaluating: { tone: 'judging', badge: 'Judging' },
    complete: { tone: 'done', badge: 'Done' },
  };
  const status = unit.state === 'paused' && unit.status !== 'complete' ? pausedUnitStatus(unit, hasLiveWork) : statuses[unit.status];
  const score = meanScore(unit);
  return {
    icon: Layers,
    title: unit.title || unit.name,
    meta: `${unit.name.toLowerCase()} · ${closed}/${unit.jobs.length} jobs`,
    tone: status.tone,
    badge: status.badge,
    ...(score === undefined ? {} : { score }),
    progress: { done: closed, total: unit.jobs.length },
    kindLabel: `Unit of work · ${unit.name}`,
    sections: [
      { heading: 'Plan', body: unit.title || unit.name },
      ...(unit.rationale === '' ? [] : [{ heading: 'Why this plan', body: unit.rationale }]),
    ],
  };
}
