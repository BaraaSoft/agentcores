import { create } from 'zustand';
import { ApiError } from '../api/api-error';
import { strategiesApi } from '../api/strategies-api';
import type { RunStrategyRequest } from '../api/types/run-strategy-request';
import type { Strategy } from '../api/types/strategy';
import type { WorkflowSummary } from '../api/types/workflow-summary';
import { workflowsApi } from '../api/workflows-api';
import type { ConnectionState } from './types/connection-state';
import type { LaunchStepState } from './types/launch-step-state';
import { RUN_STEP_IDS, type RunStepId } from './types/run-step-id';
import type { StrategyRun } from './types/strategy-run';
import type { WorkflowAction } from './types/workflow-action';

const POLL_INTERVAL_MS = 4_000;
/** How often a new run checks whether the paused Workflow has ended its last step. */
const FREE_POLL_INTERVAL_MS = 1_500;
/** The shortest time a run step shows as running, so the steps read even when the backend answers at once. */
const MIN_STEP_MS = 520;

const WAITING: LaunchStepState = { status: 'waiting', error: null };

/** Every Workflow and Strategy, the changes in flight, and the fresh run being started. */
interface WorkHubState {
  readonly connection: ConnectionState;
  readonly workflows: readonly WorkflowSummary[];
  readonly strategies: readonly Strategy[];
  readonly actions: Readonly<Record<string, WorkflowAction>>;
  /** Why the last pause or resume of a Workflow failed, by Workflow id. Cleared on the next try. */
  readonly actionErrors: Readonly<Record<string, string>>;
  readonly run: StrategyRun | null;
  /** Starts polling the backend, and returns the function that stops it. */
  readonly startPolling: () => () => void;
  readonly pauseWorkflow: (workflowId: string) => Promise<void>;
  readonly resumeWorkflow: (workflowId: string) => Promise<void>;
  /**
   * Runs a Strategy again as a fresh Workflow: pauses the Workflow on the machine with all its work,
   * starts the new one, then waits until the paused one has ended its last step. Ignored while a run starts.
   */
  readonly runStrategy: (strategyId: string, request: RunStrategyRequest) => Promise<void>;
  /** Clears the run, unless it is still in progress. */
  readonly clearRun: () => void;
}

const messageOf = (error: unknown): string => (error instanceof ApiError ? error.message : 'Something went wrong. Try again.');

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timed<T>(call: Promise<T>): Promise<T> {
  const [result] = await Promise.all([call, delay(MIN_STEP_MS)]);
  return result;
}

function isRunInProgress(run: StrategyRun | null): boolean {
  if (run === null) return false;
  const statuses = RUN_STEP_IDS.map((id) => run.steps[id].status);
  return !statuses.includes('failed') && statuses.some((status) => status !== 'done');
}

/** Holds the WorkHub data and keeps it fresh. Only this store calls the API for WorkHub. */
export const useWorkHubStore = create<WorkHubState>((set, get) => {
  const replaceWorkflow = (updated: WorkflowSummary) =>
    set({ workflows: get().workflows.map((workflow) => (workflow.id === updated.id ? updated : workflow)) });
  /** The backend pauses the other running Workflow on the machine when one starts. This shows that pause before the next poll. */
  const applyStart = (started: WorkflowSummary) => {
    const others = get()
      .workflows.filter((workflow) => workflow.id !== started.id)
      .map((workflow) =>
        workflow.state !== 'running' || workflow.machineId !== started.machineId
          ? workflow
          : { ...workflow, state: 'paused' as const, updatedAt: started.updatedAt },
      );
    set({ workflows: [started, ...others] });
  };
  const refresh = async (): Promise<void> => {
    try {
      const [workflows, strategies] = await Promise.all([workflowsApi.listWorkflows(), strategiesApi.listStrategies()]);
      set({ connection: 'live', workflows, strategies });
    } catch {
      set({ connection: 'offline' });
    }
  };
  const runAction = async (
    workflowId: string,
    action: WorkflowAction,
    call: () => Promise<WorkflowSummary>,
    apply: (updated: WorkflowSummary) => void,
  ) => {
    if (get().actions[workflowId] !== undefined) return;
    const { [workflowId]: _cleared, ...otherErrors } = get().actionErrors;
    set({ actions: { ...get().actions, [workflowId]: action }, actionErrors: otherErrors });
    try {
      apply(await call());
    } catch (error) {
      set({ actionErrors: { ...get().actionErrors, [workflowId]: messageOf(error) } });
    } finally {
      const { [workflowId]: _done, ...rest } = get().actions;
      set({ actions: rest });
    }
  };
  const updateRun = (changes: Partial<StrategyRun>) => {
    const run = get().run;
    if (run !== null) set({ run: { ...run, ...changes } });
  };
  const setRunStep = (id: RunStepId, step: LaunchStepState) => {
    const run = get().run;
    if (run !== null) set({ run: { ...run, steps: { ...run.steps, [id]: step } } });
  };
  /** A pause stops a Task before its next step, so the machine is free once the current step ends. */
  const waitUntilFree = async (workflowId: string): Promise<void> => {
    for (;;) {
      try {
        const workflows = await workflowsApi.listWorkflows();
        set({ connection: 'live', workflows });
        if (!workflows.some((workflow) => workflow.id === workflowId && workflow.activeTaskCount > 0)) return;
      } catch {
        set({ connection: 'offline' });
      }
      await delay(FREE_POLL_INTERVAL_MS);
    }
  };
  return {
    connection: 'connecting',
    workflows: [],
    strategies: [],
    actions: {},
    actionErrors: {},
    run: null,
    startPolling: () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;
      const tick = async () => {
        await refresh();
        if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
      };
      void tick();
      return () => {
        stopped = true;
        clearTimeout(timer);
      };
    },
    pauseWorkflow: (workflowId) => runAction(workflowId, 'pausing', () => workflowsApi.pauseWorkflow(workflowId), replaceWorkflow),
    resumeWorkflow: (workflowId) => runAction(workflowId, 'resuming', () => workflowsApi.startWorkflow(workflowId), applyStart),
    runStrategy: async (strategyId, request) => {
      if (isRunInProgress(get().run)) return;
      const running = get().workflows.find((workflow) => workflow.state === 'running' && workflow.machineId === request.machineId);
      set({
        run: {
          strategyId,
          steps: { pause: WAITING, start: WAITING, free: WAITING },
          pausedWorkflowId: running?.id ?? null,
          workflowId: null,
        },
      });

      setRunStep('pause', { status: 'running', error: null });
      try {
        if (running !== undefined) replaceWorkflow(await timed(workflowsApi.pauseWorkflow(running.id)));
      } catch (error) {
        setRunStep('pause', { status: 'failed', error: messageOf(error) });
        return;
      }
      setRunStep('pause', { status: 'done', error: null });

      setRunStep('start', { status: 'running', error: null });
      try {
        const started = await timed(strategiesApi.runStrategy(strategyId, request));
        applyStart(started);
        updateRun({ workflowId: started.id });
      } catch (error) {
        setRunStep('start', { status: 'failed', error: messageOf(error) });
        return;
      }
      setRunStep('start', { status: 'done', error: null });

      setRunStep('free', { status: 'running', error: null });
      if (running !== undefined) await waitUntilFree(running.id);
      else await delay(MIN_STEP_MS);
      setRunStep('free', { status: 'done', error: null });
    },
    clearRun: () => {
      if (!isRunInProgress(get().run)) set({ run: null });
    },
  };
});
