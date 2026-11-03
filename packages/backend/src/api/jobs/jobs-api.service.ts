import { Injectable, NotFoundException } from '@nestjs/common';
import { JobScreenshotService } from '../../governance/services/job-screenshot.service';
import { TaskService } from '../../governance/services/task.service';

/**
 * The screenshot route's bridge to `TaskService` and `JobScreenshotService`.
 */
@Injectable()
export class JobsApiService {
  constructor(
    private readonly tasks: TaskService,
    private readonly screenshots: JobScreenshotService,
  ) {}

  /**
   * The PNG of the last Task in the Job's sequence that has a screenshot. Only visual Tasks save one, so a
   * later Task with none, such as an export, falls back to the design before it.
   */
  async getJobScreenshot(jobId: string): Promise<Buffer> {
    const latestFirst = (await this.tasks.listTasks(jobId)).reverse();
    for (const task of latestFirst) {
      const screenshot = await this.screenshots.findTaskScreenshot({ jobId, taskId: task.id });
      if (screenshot !== null) return Buffer.from(screenshot.base64, 'base64');
    }
    throw new NotFoundException(`Job ${jobId} has no screenshot`);
  }
}
