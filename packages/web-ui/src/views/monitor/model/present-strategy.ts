import { Target } from 'lucide-react';
import type { WorkflowProgress } from '../../../api/types/workflow-progress';
import type { NodePresentation } from './node-presentation';

/** A short, readable line for the Strategy's work type, such as "one-off · up to 3 attempts". */
function workTypeLine(strategy: WorkflowProgress['strategy']): string {
  if (strategy.workType === 'continuous') return 'continuous';
  if (strategy.workType === 'multi_version') return `multi-version · ${strategy.versionCount ?? '?'} versions`;
  return `one-off · up to ${strategy.maxAttempts} attempts`;
}

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
