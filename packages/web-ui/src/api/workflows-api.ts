import { getJson, postJson } from './http-client';
import type { CreateWorkflowRequest } from './types/create-workflow-request';
import type { WorkflowProgress } from './types/workflow-progress';
import type { WorkflowSummary } from './types/workflow-summary';

/** The Workflow routes of the backend. */
export const workflowsApi = {
  listWorkflows: (): Promise<WorkflowSummary[]> => getJson('/workflows'),
  getWorkflowProgress: (workflowId: string): Promise<WorkflowProgress> => getJson(`/workflows/${workflowId}/progress`),
  createWorkflow: (request: CreateWorkflowRequest): Promise<WorkflowSummary> => postJson('/workflows', request),
  startWorkflow: (workflowId: string): Promise<WorkflowSummary> => postJson(`/workflows/${workflowId}/start`),
  pauseWorkflow: (workflowId: string): Promise<WorkflowSummary> => postJson(`/workflows/${workflowId}/pause`),
};
