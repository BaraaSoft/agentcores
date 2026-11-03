import type { ExecutionProvider } from '@ahe/agent-core';
import { createExecutionProvider } from '@ahe/execution';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { IdentityModule } from '../../../identity/identity.module';
import { MemoryModule } from '../../../memory/memory.module';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../../../queue/queue.constants';
import { registerQueues } from '../../../queue/register-queues';
import { ReasoningModule } from '../../../reasoning/reasoning.module';
import { ReportingModule } from '../../../reporting/reporting.module';
import { GovernanceModule } from '../../governance.module';
import { ExecutionPaceMeter } from './execution-pace-meter';
import { executionConfig } from './execution.config';
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
    ConfigModule.forFeature(executionConfig),
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
      inject: [executionConfig.KEY, ExecutionPaceMeter],
      useFactory: (config: ConfigType<typeof executionConfig>, paceMeter: ExecutionPaceMeter): ExecutionProvider => {
        executionLogger.log(`Computer use runs on ${config.providerName} (${config.modelId})`);
        return createExecutionProvider({
          ...config,
          onTurn: ({ turn, toolCalls }) => {
            paceMeter.recordTurn(toolCalls);
            executionLogger.debug(`Turn ${turn}: ${toolCalls.length} tool calls`);
          },
        });
      },
    },
    ExecutionPaceMeter,
    TaskExecutionProcessor,
  ],
})
export class TaskExecutionModule {}
