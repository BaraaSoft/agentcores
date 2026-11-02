import type { LaunchPanelStep } from '../../../components/strategy-components/launch-panel/launch-panel';
import { LAUNCH_STEP_IDS, type LaunchStepId } from '../../../state/types/launch-step-id';
import type { LaunchStepState } from '../../../state/types/launch-step-state';

/** The words of each step: its name, and a line for each state. */
const STEP_COPY: Record<LaunchStepId, { label: string; waiting: string; running: string; done: string; failed: string }> = {
  strategy: {
    label: 'Create the strategy',
    waiting: 'Saves your goal and how the work repeats.',
    running: 'Saving your strategy…',
    done: 'Strategy saved.',
    failed: 'The strategy was not saved.',
  },
  workflow: {
    label: 'Create the workflow',
    waiting: 'Assigns the strategy to your machine.',
    running: 'Creating the workflow…',
    done: 'Workflow ready on your machine.',
    failed: 'The workflow was not created.',
  },
  start: {
    label: 'Start the work',
    waiting: 'Your co-worker plans its first round of work.',
    running: 'Starting your co-worker…',
    done: 'Started. Your co-worker is planning now.',
    failed: 'The workflow did not start.',
  },
};

/** The launch steps as the panel shows them. */
export function presentLaunchSteps(steps: Record<LaunchStepId, LaunchStepState>): LaunchPanelStep[] {
  return LAUNCH_STEP_IDS.map((id) => ({
    id,
    label: STEP_COPY[id].label,
    detail: STEP_COPY[id][steps[id].status],
    status: steps[id].status,
    error: steps[id].error,
  }));
}

/** How far the launch is, from 0 to 1. A running step counts as half done. */
export function launchProgress(steps: Record<LaunchStepId, LaunchStepState>): number {
  const points = LAUNCH_STEP_IDS.reduce((sum, id) => sum + (steps[id].status === 'done' ? 1 : steps[id].status === 'running' ? 0.5 : 0), 0);
  return points / LAUNCH_STEP_IDS.length;
}
