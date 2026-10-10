import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

/**
 * Workflow persistence and the CRUD API. A leaf module: depends on no other AHE module.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WorkflowEntity])],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
