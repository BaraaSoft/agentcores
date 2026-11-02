import { create } from 'zustand';
import { ApiError } from '../api/api-error';
import { strategiesApi } from '../api/strategies-api';
import { workflowsApi } from '../api/workflows-api';
import { LAUNCH_STEP_IDS, type LaunchStepId } from './types/launch-step-id';
import type { LaunchStepState } from './types/launch-step-state';
import type { StrategyLaunchInput } from './types/strategy-launch-input';

/** The shortest time a step shows as running, so the progress bar reads even when the backend answers at once. */
const MIN_STEP_MS = 520;

const WAITING: LaunchStepState = { status: 'waiting', error: null };
const ALL_WAITING: Record<LaunchStepId, LaunchStepState> = { strategy: WAITING, workflow: WAITING, start: WAITING };

/** The launch of a new strategy: the state of each step, and the IDs it has created so far. */
interface StrategyLaunchState {
  readonly steps: Record<LaunchStepId, LaunchStepState>;
  readonly input: StrategyLaunchInput | null;
  readonly strategyId: string | null;
  readonly workflowId: string | null;
  /** Creates the Strategy, then its Workflow, then starts it. Ignored while a launch runs. */
  readonly launch: (input: StrategyLaunchInput) => void;
  /** Runs the launch again from the step that failed. Steps that finished are not repeated. */
  readonly retry: () => void;
  /** Clears the launch, ready for a new strategy. */
  readonly reset: () => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs one call for at least `MIN_STEP_MS`. */
async function timed<T>(call: Promise<T>): Promise<T> {
  const [result] = await Promise.all([call, delay(MIN_STEP_MS)]);
  return result;
}

function reasonOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}

/** Launches a strategy through the backend. Only this store calls the create and start routes. */
export const useStrategyLaunchStore = create<StrategyLaunchState>((set, get) => {
  const setStep = (id: LaunchStepId, step: LaunchStepState) => set({ steps: { ...get().steps, [id]: step } });
  const isRunning = () => LAUNCH_STEP_IDS.some((id) => get().steps[id].status === 'running');
  const runStep = async (id: LaunchStepId, input: StrategyLaunchInput): Promise<void> => {
    if (id === 'strategy') {
      const strategy = await timed(strategiesApi.createStrategy(input.strategy));
      set({ strategyId: strategy.id });
      return;
    }
    if (id === 'workflow') {
      const workflow = await timed(
        workflowsApi.createWorkflow({ strategyId: get().strategyId ?? '', machineId: input.machineId, resources: input.resources }),
      );
      set({ workflowId: workflow.id });
      return;
    }
    await timed(workflowsApi.startWorkflow(get().workflowId ?? ''));
  };
  const run = async (): Promise<void> => {
    const input = get().input;
    if (input === null) return;
    for (const id of LAUNCH_STEP_IDS) {
      if (get().steps[id].status === 'done') continue;
      setStep(id, { status: 'running', error: null });
      try {
        await runStep(id, input);
        setStep(id, { status: 'done', error: null });
      } catch (error) {
        setStep(id, { status: 'failed', error: reasonOf(error) });
        return;
      }
    }
  };
  return {
    steps: ALL_WAITING,
    input: null,
    strategyId: null,
    workflowId: null,
    launch: (input) => {
      if (isRunning()) return;
      set({ steps: ALL_WAITING, input, strategyId: null, workflowId: null });
      void run();
    },
    retry: () => {
      if (isRunning()) return;
      void run();
    },
    reset: () => {
      if (isRunning()) return;
      set({ steps: ALL_WAITING, input: null, strategyId: null, workflowId: null });
    },
  };
});
