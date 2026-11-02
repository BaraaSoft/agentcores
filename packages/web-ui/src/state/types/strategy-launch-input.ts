import type { CreateStrategyRequest } from '../../api/types/create-strategy-request';
import type { CreateWorkflowRequest } from '../../api/types/create-workflow-request';

/** Everything the launch needs: the Strategy to create, and where and within which limits its Workflow runs. */
export interface StrategyLaunchInput {
  readonly strategy: CreateStrategyRequest;
  readonly machineId: string;
  readonly resources: CreateWorkflowRequest['resources'];
}
