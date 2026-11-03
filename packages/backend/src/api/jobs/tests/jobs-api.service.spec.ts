import { NotFoundException } from '@nestjs/common';
import type { JobScreenshotService } from '../../../governance/services/job-screenshot.service';
import type { TaskService } from '../../../governance/services/task.service';
import { JobsApiService } from '../jobs-api.service';

const png = (text: string) => ({ mediaType: 'image/png' as const, base64: Buffer.from(text).toString('base64') });

function setup(saved: Record<string, string>) {
  const tasks = {
    listTasks: jest.fn().mockResolvedValue([
      { id: 'task-1', sequence: 1 },
      { id: 'task-2', sequence: 2 },
      { id: 'task-3', sequence: 3 },
    ]),
  };
  const screenshots = {
    findTaskScreenshot: jest.fn(async ({ taskId }: { taskId: string }) => (taskId in saved ? png(saved[taskId]) : null)),
  };
  const service = new JobsApiService(tasks as unknown as TaskService, screenshots as unknown as JobScreenshotService);
  return { service, tasks };
}

describe('JobsApiService', () => {
  it('returns the screenshot of the last Task in the sequence', async () => {
    const t = setup({ 'task-1': 'first', 'task-3': 'final' });

    const image = await t.service.getJobScreenshot('job-1');

    expect(t.tasks.listTasks).toHaveBeenCalledWith('job-1');
    expect(image.toString()).toBe('final');
  });

  it('falls back to an earlier Task when the last ones saved no screenshot', async () => {
    const t = setup({ 'task-1': 'first', 'task-2': 'design' });

    expect((await t.service.getJobScreenshot('job-1')).toString()).toBe('design');
  });

  it('answers 404 when no Task of the Job has a screenshot', async () => {
    const t = setup({});

    await expect(t.service.getJobScreenshot('job-1')).rejects.toThrow(NotFoundException);
  });
});
