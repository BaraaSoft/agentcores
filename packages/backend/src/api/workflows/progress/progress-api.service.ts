import { Injectable, NotFoundException } from '@nestjs/common';
import type { JobEntity } from '../../../governance/entities/job.entity';
import type { TaskEntity } from '../../../governance/entities/task.entity';
import { JobEvaluationService } from '../../../governance/services/job-evaluation.service';
import { JobService } from '../../../governance/services/job.service';
import { TaskService } from '../../../governance/services/task.service';
import { UnitOfWorkService } from '../../../governance/services/unit-of-work.service';
import { WorkflowService } from '../../../workflow/workflow.service';
import { JobProgressResponseDto } from './dtos/job-progress-response.dto';
import { StrategyResponseDto } from '../../strategies/dtos/strategy-response.dto';
import { UnitOfWorkProgressResponseDto } from './dtos/unit-of-work-progress-response.dto';
import { WorkflowProgressResponseDto } from './dtos/workflow-progress-response.dto';

/**
 * Reads what a Workflow's Strategy has done so far: its Units of Work, their Jobs and Tasks, and the
 * evaluation of each Job. Read only, in five queries whatever the number of Units of Work.
 */
@Injectable()
export class ProgressApiService {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly unitsOfWork: UnitOfWorkService,
    private readonly jobs: JobService,
    private readonly tasks: TaskService,
    private readonly evaluations: JobEvaluationService,
  ) {}

  async getWorkflowProgress(workflowId: string): Promise<WorkflowProgressResponseDto> {
    const workflow = await this.workflows.findWorkflowById(workflowId);
    if (workflow === null) throw new NotFoundException(`Workflow ${workflowId} not found`);
    const unitsOfWork = await this.unitsOfWork.listUnitsOfWork(workflow.strategyId);
    const unitOfWorkIds = unitsOfWork.map((unitOfWork) => unitOfWork.id);
    const [jobs, evaluations] = await Promise.all([
      this.jobs.listJobsInUnits(unitOfWorkIds),
      this.evaluations.listEvaluationsByJob(unitOfWorkIds),
    ]);
    const tasksByJob = groupTasksByJob(await this.tasks.listTasksInJobs(jobs.map((job) => job.id)));
    const toJob = (job: JobEntity) => JobProgressResponseDto.fromEntity(job, evaluations.get(job.id), tasksByJob.get(job.id) ?? []);
    return Object.assign(new WorkflowProgressResponseDto(), {
      workflowId: workflow.id,
      workflowState: workflow.state,
      strategy: StrategyResponseDto.fromEntity(workflow.strategy),
      unitsOfWork: unitsOfWork.map((unitOfWork) =>
        UnitOfWorkProgressResponseDto.fromEntity(unitOfWork, jobs.filter((job) => job.unitOfWorkId === unitOfWork.id).map(toJob)),
      ),
    });
  }
}

function groupTasksByJob(tasks: readonly TaskEntity[]): Map<string, TaskEntity[]> {
  const byJob = new Map<string, TaskEntity[]>();
  for (const task of tasks) byJob.set(task.jobId, [...(byJob.get(task.jobId) ?? []), task]);
  return byJob;
}
