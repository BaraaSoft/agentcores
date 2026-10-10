import type { ExecutionProvider } from '@ahe/agent-core';
import { createComputerUseProvider } from '@ahe/execution';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GovernanceModule } from '../governance/governance.module';
import { IdentityModule } from '../identity/identity.module';
import { MemoryModule } from '../memory/memory.module';
import { TASK_EXECUTION_QUEUE } from '../queue/queue.constants';
import { ReasoningModule } from '../reasoning/reasoning.module';
import { ReportingModule } from '../reporting/reporting.module';
import { StepRouterModule } from '../router/step-router.module';
import { HarnessService } from './harness.service';
import { EXECUTION_PROVIDER } from './harness.tokens';
import { TaskExecutionProcessor } from './processors/task-execution.processor';

/**
 * The harness: wires reasoning, routing, memory, and the execution layer into the
 * Task loop. This is the only module that knows about `@ahe/execution`.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: TASK_EXECUTION_QUEUE }),
    GovernanceModule,
    IdentityModule,
    MemoryModule,
    ReasoningModule,
    ReportingModule,
    StepRouterModule,
  ],
  providers: [
    {
      provide: EXECUTION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ExecutionProvider =>
        createComputerUseProvider({
          apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY'),
          modelId: config.getOrThrow<string>('EXECUTION_MODEL_ID'),
          maxScreenshotWidth: Number(config.getOrThrow<string>('SCREENSHOT_MAX_WIDTH')),
          maxScreenshotHeight: Number(config.getOrThrow<string>('SCREENSHOT_MAX_HEIGHT')),
        }),
    },
    HarnessService,
    TaskExecutionProcessor,
  ],
})
export class HarnessModule {}
