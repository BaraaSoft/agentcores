import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { LoggedWorkerHost } from '../logged-worker-host';

class ExampleProcessor extends LoggedWorkerHost {
  async process(): Promise<void> {}
}

const job = (attemptsMade: number) => ({ id: 'job-1', attemptsMade, opts: { attempts: 3 } }) as unknown as Job;

describe('LoggedWorkerHost', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs a failed delivery that the queue will try again', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    new ExampleProcessor().logFailure(job(1), new Error('bad answer'));

    expect(warn).toHaveBeenCalledWith('Queue job job-1 failed, it will try again (1 of 3 tries used): bad answer');
  });

  it('says when no tries are left', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    new ExampleProcessor().logFailure(job(3), new Error('bad answer'));

    expect(warn).toHaveBeenCalledWith('Queue job job-1 failed, no tries left: bad answer');
  });

  it('still logs when BullMQ could not read the job', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    new ExampleProcessor().logFailure(undefined, new Error('lost'));

    expect(warn).toHaveBeenCalledWith('Queue job unknown failed, no tries left: lost');
  });
});
