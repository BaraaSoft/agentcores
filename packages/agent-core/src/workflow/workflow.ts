import type { Strategy } from '../governance/strategy';
import type { WorkflowResources } from './workflow-resources';
import type { WorkflowState } from './workflow-state';

/**
 * One owner's self-contained agent: a goal, its current 30-day Strategy,
 * the history it learns from, and the resources it may use.
 */
export interface Workflow {
  readonly id: string;
  readonly name: string;
  /** HumanExperiences user ID of the person this Workflow acts for. */
  readonly owner: string;
  readonly activeStrategy: Strategy | null;
  readonly strategyHistory: readonly Strategy[];
  readonly resources: WorkflowResources;
  readonly state: WorkflowState;
}
