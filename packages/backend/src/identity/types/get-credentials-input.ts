/**
 * Which account login the harness needs for a step.
 */
export interface GetCredentialsInput {
  readonly workflowId: string;
  /** Site domain, e.g. `reddit.com`. */
  readonly platform: string;
}
