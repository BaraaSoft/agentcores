import { BullModule } from '@nestjs/bullmq';
import { JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE } from '../queue.constants';
import { registerQueues } from '../register-queues';

describe('registerQueues', () => {
  afterEach(() => jest.restoreAllMocks());

  it('registers each queue with its own default job options', () => {
    const registerQueue = jest.spyOn(BullModule, 'registerQueue');

    registerQueues(JOB_EXECUTION_QUEUE, TASK_EXECUTION_QUEUE);

    expect(registerQueue).toHaveBeenCalledWith(
      {
        name: JOB_EXECUTION_QUEUE,
        defaultJobOptions: expect.objectContaining({ attempts: 3, removeOnComplete: true }),
      },
      { name: TASK_EXECUTION_QUEUE, defaultJobOptions: { attempts: 1 } },
    );
  });
});
