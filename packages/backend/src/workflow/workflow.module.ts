import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowService } from './workflow.service';

/**
 * Workflow persistence. A leaf module: depends on no other AgentCores.AI module. Its routes live in `ApiModule`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity])],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
