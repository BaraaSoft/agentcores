import type { ExecutionProvider } from '@ahe/agent-core';
import { createComputerUseProvider } from '@ahe/execution';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityModule } from '../../../identity/identity.module';
import { MemoryModule } from '../../../memory/memory.module';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import { registerQueues } from '../../../queue/register-queues';
import { ReasoningModule } from '../../../reasoning/reasoning.module';
import { ReportingModule } from '../../../reporting/reporting.module';
import { GovernanceModule } from '../../governance.module';
import { TaskExecutionProcessor } from './task-execution.processor';
import { EXECUTION_PROVIDER } from './task-execution.tokens';

const executionLogger = new Logger('Execution');

/**
 * Task level of governance: the worker that loops Task reasoning against the execution layer.
 * This is the only module that knows about `@ahe/execution`. It is its own module, not part of
 * `GovernanceModule`, because it needs `ReportingModule`, which itself imports `GovernanceModule`.
 */
@Module({
  imports: [
    registerQueues(TASK_EXECUTION_QUEUE, JOB_EXECUTION_QUEUE),
    GovernanceModule,
    IdentityModule,
    MemoryModule,
    ReasoningModule,
    ReportingModule,
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
          onTurn: ({ turn, toolCalls }) => executionLogger.debug(`Turn ${turn}: ${toolCalls.length} tool calls`),
        }),
    },
    TaskExecutionProcessor,
  ],
})
export class TaskExecutionModule {}
