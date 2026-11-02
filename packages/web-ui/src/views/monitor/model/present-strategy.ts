import { Target } from 'lucide-react';
import type { WorkflowProgress } from '../../../api/types/workflow-progress';
import type { NodePresentation } from './node-presentation';
import { workTypeLine } from './work-type-line';

const STATES = {
  running: { tone: 'live', badge: 'Running' },
  paused: { tone: 'waiting', badge: 'Paused' },
  done: { tone: 'done', badge: 'Done' },
} as const;

/** Maps the Strategy to its card. The state of this run sets whether it runs, rests, or is done. */
export function presentStrategy(progress: WorkflowProgress): NodePresentation {
  const { tone, badge } = STATES[progress.workflowState];
  return {
    icon: Target,
    title: progress.strategy.name,
    meta: workTypeLine(progress.strategy),
    tone,
    badge,
    kindLabel: 'Strategy',
    sections: [
      { heading: 'Objective', body: progress.strategy.objective },
      { heading: 'Work type', body: workTypeLine(progress.strategy) },
    ],
  };
}
