import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import type { MetricsService } from '../../governance/services/metrics.service';
import type { TaskService } from '../../governance/services/task.service';
import type { JobExecutionJobData } from '../../queue/types/job-execution-job-data';
import type { DailyReportEntity } from '../entities/daily-report.entity';
import type { EscalationEntity } from '../entities/escalation.entity';
import { ReportingService } from '../reporting.service';

const ESCALATION = { id: 'esc-1', workflowId: 'wf-1', taskId: 'task-1', question: 'No login for canva.com', status: 'open' };

function setup({ found = ESCALATION as unknown, affected = 1 } = {}) {
  const escalations = {
    create: jest.fn((fields: object) => fields),
    save: jest.fn(async (fields: object) => ({ id: 'esc-1', status: 'open', ...fields })),
    findOneBy: jest.fn().mockResolvedValue(found),
    findOneByOrFail: jest.fn().mockResolvedValue({ ...ESCALATION, status: 'approved' }),
    update: jest.fn().mockResolvedValue({ affected }),
    find: jest.fn().mockResolvedValue([ESCALATION]),
  };
  const reports = { find: jest.fn().mockResolvedValue([]) };
  const tasks = {
    markTaskEscalated: jest.fn().mockResolvedValue(true),
    markTaskPending: jest.fn().mockResolvedValue(true),
    markTaskFailed: jest.fn().mockResolvedValue(true),
    findTaskWithLineage: jest.fn().mockResolvedValue({ id: 'task-1', jobId: 'job-1' }),
  };
  const jobQueue = { add: jest.fn() };
  const service = new ReportingService(
    reports as unknown as Repository<DailyReportEntity>,
    escalations as unknown as Repository<EscalationEntity>,
    {} as MetricsService,
    tasks as unknown as TaskService,
    jobQueue as unknown as Queue<JobExecutionJobData>,
  );
  return { service, escalations, reports, tasks, jobQueue };
}

describe('ReportingService', () => {
  it('raises an escalation and holds its Task', async () => {
    const t = setup();

    const escalation = await t.service.raiseEscalation({ workflowId: 'wf-1', taskId: 'task-1', question: 'No login for canva.com' });

    expect(escalation).toMatchObject({ workflowId: 'wf-1', taskId: 'task-1', status: 'open' });
    expect(t.tasks.markTaskEscalated).toHaveBeenCalledWith({ taskId: 'task-1', reason: 'No login for canva.com' });
  });

  it('on approval, sends the Task back to pending and queues its Job again', async () => {
    const t = setup();

    await t.service.resolveEscalation({ escalationId: 'esc-1', isApproved: true, ownerNote: 'Signed in now' });

    expect(t.escalations.update).toHaveBeenCalledWith(
      { id: 'esc-1', status: 'open' },
      expect.objectContaining({ status: 'approved', ownerNote: 'Signed in now' }),
    );
    expect(t.tasks.markTaskPending).toHaveBeenCalledWith('task-1');
    expect(t.jobQueue.add).toHaveBeenCalledWith('job-1', { workflowId: 'wf-1', jobId: 'job-1' }, { jobId: 'job-1' });
  });

  it('on rejection, fails the Task with the owner note and queues its Job for review', async () => {
    const t = setup();

    await t.service.resolveEscalation({ escalationId: 'esc-1', isApproved: false, ownerNote: 'Use the free plan' });

    expect(t.tasks.markTaskFailed).toHaveBeenCalledWith({ taskId: 'task-1', reason: 'The owner rejected this step: Use the free plan' });
    expect(t.jobQueue.add).toHaveBeenCalledTimes(1);
  });

  it('answers 404 for an unknown escalation and 409 for one already resolved', async () => {
    await expect(setup({ found: null }).service.resolveEscalation({ escalationId: 'x', isApproved: true, ownerNote: null })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const resolved = setup({ affected: 0 });
    await expect(resolved.service.resolveEscalation({ escalationId: 'esc-1', isApproved: true, ownerNote: null })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(resolved.jobQueue.add).not.toHaveBeenCalled();
  });

  it('lists the open escalations of a Workflow, oldest first', async () => {
    const t = setup();

    expect(await t.service.listOpenEscalations('wf-1')).toEqual([ESCALATION]);
    expect(t.escalations.find).toHaveBeenCalledWith({ where: { workflowId: 'wf-1', status: 'open' }, order: { createdAt: 'ASC' } });
  });
});
