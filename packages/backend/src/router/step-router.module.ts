import { Module } from '@nestjs/common';
import { StepRouterService } from './step-router.service';

/**
 * The step router. Named `StepRouter…` to avoid clashing with Nest's own `RouterModule`.
 */
@Module({
  providers: [StepRouterService],
  exports: [StepRouterService],
})
export class StepRouterModule {}
