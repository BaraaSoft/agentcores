import type { Screenshot } from '@ahe/agent-core';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SaveTaskScreenshotInput } from '../types/save-task-screenshot-input';
import { TEMP_DATA_DIR, TEMP_DATA_DIR_TOKEN } from './job-screenshot.constants';

const JOB_FOLDER_PREFIX = 'job-';

/**
 * Keeps the final screen of visual Tasks on disk, at `job-<jobId>/screenshots/<taskId>.png` under the
 * temporary data folder, so Job review and the evaluator can see the work. A Task keeps only its
 * latest screenshot. The files are temporary: they stay after the evaluation, so the owner can see the
 * work, and the orchestrator's sweep deletes a Job's folder two days after its last write.
 */
@Injectable()
export class JobScreenshotService {
  constructor(@Optional() @Inject(TEMP_DATA_DIR_TOKEN) private readonly baseDir: string = TEMP_DATA_DIR) {}

  /** Saves the screenshot as the Task's latest, replacing the one before it. */
  async saveTaskScreenshot(input: SaveTaskScreenshotInput): Promise<void> {
    const folder = this.screenshotFolder(input.jobId);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, `${input.taskId}.png`), Buffer.from(input.screenshot.base64, 'base64'));
  }

  /** The Task's latest screenshot, or null when it has none. */
  async findTaskScreenshot(input: { jobId: string; taskId: string }): Promise<Screenshot | null> {
    return this.read(join(this.screenshotFolder(input.jobId), `${input.taskId}.png`));
  }

  /** The newest screenshot of any of the Job's Tasks, or null when the Job has none. */
  async findLatestJobScreenshot(jobId: string): Promise<Screenshot | null> {
    const folder = this.screenshotFolder(jobId);
    const names = await readdir(folder).catch(() => []);
    const files = await Promise.all(
      names.map(async (name) => ({ path: join(folder, name), modifiedAt: (await stat(join(folder, name))).mtimeMs })),
    );
    const newest = files.sort((a, b) => b.modifiedAt - a.modifiedAt)[0];
    return newest === undefined ? null : this.read(newest.path);
  }

  /** Deletes all of the Job's screenshots. Safe to call when it has none. */
  async deleteJobScreenshots(jobId: string): Promise<void> {
    await rm(join(this.baseDir, `${JOB_FOLDER_PREFIX}${jobId}`), { recursive: true, force: true });
  }

  /** Deletes every Job folder last written before `before`. Returns how many it deleted. */
  async deleteScreenshotsOlderThan(before: Date): Promise<number> {
    const names = await readdir(this.baseDir).catch(() => []);
    const folders = names.filter((name) => name.startsWith(JOB_FOLDER_PREFIX)).map((name) => join(this.baseDir, name));
    const stale = await Promise.all(folders.map(async (folder) => ((await this.lastWrite(folder)) < before ? folder : null)));
    const toDelete = stale.filter((folder): folder is string => folder !== null);
    await Promise.all(toDelete.map((folder) => rm(folder, { recursive: true, force: true })));
    return toDelete.length;
  }

  /** A new screenshot touches the `screenshots` folder, not the Job folder above it. */
  private async lastWrite(jobFolder: string): Promise<Date> {
    const screenshots = await stat(join(jobFolder, 'screenshots')).catch(() => null);
    return (screenshots ?? (await stat(jobFolder))).mtime;
  }

  private screenshotFolder(jobId: string): string {
    return join(this.baseDir, `${JOB_FOLDER_PREFIX}${jobId}`, 'screenshots');
  }

  private async read(path: string): Promise<Screenshot | null> {
    const data = await readFile(path).catch(() => null);
    return data === null ? null : { mediaType: 'image/png', base64: data.toString('base64') };
  }
}
