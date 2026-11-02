/** Where a new Workflow is: not asked for, being created, created, or refused with a reason. */
export type CreationState =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | { readonly status: 'done'; readonly workflowId: string; readonly started: boolean }
  | { readonly status: 'failed'; readonly error: string };
