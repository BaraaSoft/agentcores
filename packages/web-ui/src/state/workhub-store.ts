import { create } from 'zustand';
import { ApiError } from '../api/api-error';
import { strategiesApi } from '../api/strategies-api';
import type { Strategy } from '../api/types/strategy';
import type { WorkflowSummary } from '../api/types/workflow-summary';
import { workflowsApi } from '../api/workflows-api';
import type { ConnectionState } from './types/connection-state';
import type { CreationState } from './types/creation-state';
import type { NewWorkflowInput } from './types/new-workflow-input';
import type { WorkflowAction } from './types/workflow-action';

const POLL_INTERVAL_MS = 4_000;

/** Every Workflow and Strategy, the changes in flight, and the new Workflow being made. */
interface WorkHubState {
  readonly connection: ConnectionState;
  readonly workflows: readonly WorkflowSummary[];
  readonly strategies: readonly Strategy[];
  readonly actions: Readonly<Record<string, WorkflowAction>>;
  /** Why the last pause or resume of a Workflow failed, by Workflow id. Cleared on the next try. */
  readonly actionErrors: Readonly<Record<string, string>>;
  readonly creation: CreationState;
  /** Starts polling the backend, and returns the function that stops it. */
  readonly startPolling: () => () => void;
  readonly pauseWorkflow: (workflowId: string) => Promise<void>;
  readonly resumeWorkflow: (workflowId: string) => Promise<void>;
  readonly createWorkflow: (input: NewWorkflowInput) => Promise<void>;
  readonly clearCreation: () => void;
}

const messageOf = (error: unknown): string => (error instanceof ApiError ? error.message : 'Something went wrong. Try again.');

/** Holds the WorkHub data and keeps it fresh. Only this store calls the API for WorkHub. */
export const useWorkHubStore = create<WorkHubState>((set, get) => {
  const replaceWorkflow = (updated: WorkflowSummary) =>
    set({ workflows: get().workflows.map((workflow) => (workflow.id === updated.id ? updated : workflow)) });
  /** The backend pauses the other running Workflow on the machine when one starts. This shows that pause before the next poll. */
  const applyStart = (started: WorkflowSummary) =>
    set({
      workflows: get().workflows.map((workflow) => {
        if (workflow.id === started.id) return started;
        if (workflow.state !== 'running' || workflow.machineId !== started.machineId) return workflow;
        return { ...workflow, state: 'paused', updatedAt: started.updatedAt };
      }),
    });
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
  return {
    connection: 'connecting',
    workflows: [],
    strategies: [],
    actions: {},
    actionErrors: {},
    creation: { status: 'idle' },
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
    createWorkflow: async (input) => {
      if (get().creation.status === 'running') return;
      set({ creation: { status: 'running' } });
      let created: WorkflowSummary;
      try {
        created = await workflowsApi.createWorkflow({
          strategyId: input.strategyId,
          machineId: input.machineId,
          resources: input.resources,
        });
      } catch (error) {
        set({ creation: { status: 'failed', error: messageOf(error) } });
        return;
      }
      set({ workflows: [created, ...get().workflows] });
      if (!input.startNow) {
        set({ creation: { status: 'done', workflowId: created.id, started: false } });
        return;
      }
      try {
        applyStart(await workflowsApi.startWorkflow(created.id));
        set({ creation: { status: 'done', workflowId: created.id, started: true } });
      } catch (error) {
        set({
          creation: { status: 'failed', error: `The workflow was created but did not start: ${messageOf(error)} Resume it from its card.` },
        });
      }
    },
    clearCreation: () => set({ creation: { status: 'idle' } }),
  };
});
