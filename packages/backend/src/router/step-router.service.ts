import { Injectable, NotImplementedException } from '@nestjs/common';
import type { PlannedStep } from '../reasoning/types/planned-step';
import type { RouteDecision } from './types/route-decision';

/**
 * The hinge between the two tiers: for each planned step, decides whether it is
 * mechanical (execution layer), strategic (reasoning layer), or needs a human.
 * Pure and synchronous — no model calls, so routing is cheap and predictable.
 */
@Injectable()
export class StepRouterService {
  /**
   * Picks the route for one planned step. Escalation always wins over execution.
   */
  routeStep(step: PlannedStep): RouteDecision {
    throw new NotImplementedException();
  }
}
