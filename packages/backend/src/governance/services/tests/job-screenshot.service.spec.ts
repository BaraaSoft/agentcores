import { mkdtemp, readdir, readFile, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JobScreenshotService } from '../job-screenshot.service';

const png = (text: string) => ({ mediaType: 'image/png' as const, base64: Buffer.from(text).toString('base64') });
const DAY_MS = 24 * 60 * 60 * 1000;

describe('JobScreenshotService', () => {
  let baseDir: string;
  let service: JobScreenshotService;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'ahe-screenshots-'));
    service = new JobScreenshotService(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('saves a screenshot at job-<id>/screenshots/<taskId>.png and reads it back', async () => {
    await service.saveTaskScreenshot({ jobId: 'one', taskId: 'task-1', screenshot: png('first') });

    expect((await readFile(join(baseDir, 'job-one', 'screenshots', 'task-1.png'))).toString()).toBe('first');
    expect(await service.findTaskScreenshot({ jobId: 'one', taskId: 'task-1' })).toEqual(png('first'));
  });

  it('keeps only the latest screenshot of a Task', async () => {
    await service.saveTaskScreenshot({ jobId: 'one', taskId: 'task-1', screenshot: png('first') });
    await service.saveTaskScreenshot({ jobId: 'one', taskId: 'task-1', screenshot: png('second') });

    expect(await service.findTaskScreenshot({ jobId: 'one', taskId: 'task-1' })).toEqual(png('second'));
  });

  it('returns null for a Task or a Job with no screenshot', async () => {
    expect(await service.findTaskScreenshot({ jobId: 'one', taskId: 'task-1' })).toBeNull();
    expect(await service.findLatestJobScreenshot('one')).toBeNull();
  });

  it('finds the newest screenshot across the Job Tasks', async () => {
    await service.saveTaskScreenshot({ jobId: 'one', taskId: 'task-1', screenshot: png('older') });
    await service.saveTaskScreenshot({ jobId: 'one', taskId: 'task-2', screenshot: png('newer') });
    const older = new Date(Date.now() - 60_000);
    await utimes(join(baseDir, 'job-one', 'screenshots', 'task-1.png'), older, older);

    expect(await service.findLatestJobScreenshot('one')).toEqual(png('newer'));
  });

  it('deletes one Job folder and leaves the others', async () => {
    await service.saveTaskScreenshot({ jobId: 'one', taskId: 'task-1', screenshot: png('a') });
    await service.saveTaskScreenshot({ jobId: 'two', taskId: 'task-2', screenshot: png('b') });

    await service.deleteJobScreenshots('one');
    await service.deleteJobScreenshots('unknown');

    expect(await readdir(baseDir)).toEqual(['job-two']);
  });

  it('sweeps only the Job folders last written before the cutoff', async () => {
    await service.saveTaskScreenshot({ jobId: 'old', taskId: 'task-1', screenshot: png('a') });
    await service.saveTaskScreenshot({ jobId: 'new', taskId: 'task-2', screenshot: png('b') });
    const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS);
    await utimes(join(baseDir, 'job-old', 'screenshots'), threeDaysAgo, threeDaysAgo);

    expect(await service.deleteScreenshotsOlderThan(new Date(Date.now() - 2 * DAY_MS))).toBe(1);
    expect(await readdir(baseDir)).toEqual(['job-new']);
  });

  it('sweeps nothing when the folder does not exist yet', async () => {
    const missing = new JobScreenshotService(join(baseDir, 'not-there'));

    expect(await missing.deleteScreenshotsOlderThan(new Date())).toBe(0);
  });
});
