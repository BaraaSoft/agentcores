import { getJson } from './http-client';
import type { WorkflowProgress } from './types/workflow-progress';
import type { WorkflowSummary } from './types/workflow-summary';

/** The Workflow routes of the backend. */
export const workflowsApi = {
  listWorkflows: (): Promise<WorkflowSummary[]> => getJson('/workflows'),
  getWorkflowProgress: (workflowId: string): Promise<WorkflowProgress> => getJson(`/workflows/${workflowId}/progress`),
};
