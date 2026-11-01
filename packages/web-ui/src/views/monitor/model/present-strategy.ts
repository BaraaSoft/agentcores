import { Target } from 'lucide-react';
import type { WorkflowProgress } from '../../../api/types/workflow-progress';
import type { NodePresentation } from './node-presentation';
import { workTypeLine } from './work-type-line';

/** Maps the Strategy to its card. The Workflow state sets whether it runs or rests. */
export function presentStrategy(progress: WorkflowProgress): NodePresentation {
  const running = progress.workflowState === 'running';
  return {
    icon: Target,
    title: progress.strategy.name,
    meta: workTypeLine(progress.strategy),
    tone: running ? 'live' : 'waiting',
    badge: running ? 'Running' : 'Paused',
    kindLabel: 'Strategy',
    sections: [
      { heading: 'Objective', body: progress.strategy.objective },
      { heading: 'Work type', body: workTypeLine(progress.strategy) },
    ],
  };
}
