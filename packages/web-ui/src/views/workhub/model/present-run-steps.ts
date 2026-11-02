import type { StrategyWorkType } from '../../../api/types/strategy-work-type';
import type { LaunchPanelStep } from '../../../components/strategy-components/launch-panel/launch-panel';
import type { LaunchStepState } from '../../../state/types/launch-step-state';
import { RUN_STEP_IDS, type RunStepId } from '../../../state/types/run-step-id';
import type { StrategyRun } from '../../../state/types/strategy-run';

/** The run steps as the panel shows them, and how far the run is. */
export interface RunPresentation {
  readonly steps: LaunchPanelStep[];
  /** From 0 to 1. A running step counts as half done. */
  readonly progress: number;
  readonly isInProgress: boolean;
  readonly isDone: boolean;
  readonly hasFailed: boolean;
}

type StepCopy = Record<'label' | LaunchStepState['status'], string>;

const FIRST_UNIT_NAMES: Record<StrategyWorkType, string> = {
  continuous: 'round 1',
  one_off: 'attempt 1',
  multi_version: 'version 1',
};

function stepCopy(pausedName: string | null, workType: StrategyWorkType): Record<RunStepId, StepCopy> {
  const firstUnit = FIRST_UNIT_NAMES[workType];
  return {
    pause: {
      label: 'Pause the running work',
      waiting: pausedName === null ? 'Nothing runs on the machine now.' : `Pauses "${pausedName}" and all its work.`,
      running: `Pausing "${pausedName ?? 'the running workflow'}"…`,
      done: pausedName === null ? 'Nothing needed a pause.' : `"${pausedName}" and all its work are paused.`,
      failed: 'The running work was not paused.',
    },
    start: {
      label: 'Start a fresh run',
      waiting: `A new workflow begins at ${firstUnit} and plans with what earlier runs learned.`,
      running: 'Starting the fresh run…',
      done: `Started. Your co-worker plans ${firstUnit} now.`,
      failed: 'The fresh run did not start.',
    },
    free: {
      label: 'Free the machine',
      waiting: 'Your co-worker ends the step it is on before the new run uses the machine.',
      running:
        pausedName === null ? 'Checking the machine…' : `Finishing the current step of "${pausedName}". This can take a few minutes.`,
      done: 'The machine is free. The fresh run has it now.',
      failed: 'The machine did not become free.',
    },
  };
}

/** The steps of a fresh run, in the words the panel shows. `pausedName` is the Strategy of the paused Workflow. */
export function presentRunSteps(run: StrategyRun, pausedName: string | null, workType: StrategyWorkType): RunPresentation {
  const copy = stepCopy(pausedName, workType);
  const statuses = RUN_STEP_IDS.map((id) => run.steps[id].status);
  const points = statuses.reduce((sum, status) => sum + (status === 'done' ? 1 : status === 'running' ? 0.5 : 0), 0);
  const hasFailed = statuses.includes('failed');
  const isDone = statuses.every((status) => status === 'done');
  return {
    steps: RUN_STEP_IDS.map((id) => ({
      id,
      label: copy[id].label,
      detail: copy[id][run.steps[id].status],
      status: run.steps[id].status,
      error: run.steps[id].error,
    })),
    progress: points / RUN_STEP_IDS.length,
    isInProgress: !hasFailed && !isDone,
    isDone,
    hasFailed,
  };
}
