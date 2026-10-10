/**
 * Where a planned step goes next.
 * - `execution`: mechanical, on-screen work → the computer-use loop.
 * - `reasoning`: strategic, no screen needed → back to the reasoning layer.
 * - `escalation`: needs human judgment → stop and ask the owner.
 * - `done`: the Task is already complete.
 */
export interface RouteDecision {
  readonly route: 'execution' | 'reasoning' | 'escalation' | 'done';
  readonly reason: string;
}
