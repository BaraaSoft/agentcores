import { create } from 'zustand';
import { workflowsApi } from '../api/workflows-api';
import type { WorkflowProgress } from '../api/types/workflow-progress';
import type { WorkflowSummary } from '../api/types/workflow-summary';
import type { ConnectionState } from './types/connection-state';

const POLL_INTERVAL_MS = 2_000;

/** The live view of the agent's work: the Workflows, the one on screen, and its latest progress. */
interface MonitorState {
  readonly connection: ConnectionState;
  readonly workflows: readonly WorkflowSummary[];
  readonly selectedWorkflowId: string | null;
  readonly progress: WorkflowProgress | null;
  readonly updatedAt: number | null;
  /** Starts polling the backend, and returns the function that stops it. */
  readonly startPolling: () => () => void;
  readonly selectWorkflow: (workflowId: string) => void;
}

/** Holds the monitor data and keeps it fresh. Only this store calls the Workflow API. */
export const useMonitorStore = create<MonitorState>((set, get) => {
  const pickWorkflow = (workflows: readonly WorkflowSummary[]): string | null => {
    const selected = get().selectedWorkflowId;
    if (selected !== null && workflows.some((workflow) => workflow.id === selected)) return selected;
    return (workflows.find((workflow) => workflow.state === 'running') ?? workflows[0])?.id ?? null;
  };
  const refresh = async (): Promise<void> => {
    try {
      const workflows = await workflowsApi.listWorkflows();
      const selectedWorkflowId = pickWorkflow(workflows);
      const progress = selectedWorkflowId === null ? null : await workflowsApi.getWorkflowProgress(selectedWorkflowId);
      set({ connection: 'live', workflows, selectedWorkflowId, progress, updatedAt: Date.now() });
    } catch {
      set({ connection: 'offline' });
    }
  };
  return {
    connection: 'connecting',
    workflows: [],
    selectedWorkflowId: null,
    progress: null,
    updatedAt: null,
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
    selectWorkflow: (workflowId) => {
      set({ selectedWorkflowId: workflowId, progress: null });
      void refresh();
    },
  };
});
