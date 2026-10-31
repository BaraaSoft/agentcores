import type { Repository } from 'typeorm';
import type { MetricSnapshotEntity } from '../../entities/metric-snapshot.entity';
import { MetricsService } from '../metrics.service';
import type { UnitOfWorkService } from '../unit-of-work.service';

function setup() {
  const snapshots = { create: jest.fn((fields: object) => fields), save: jest.fn() };
  const service = new MetricsService(snapshots as unknown as Repository<MetricSnapshotEntity>, {} as UnitOfWorkService);
  return { service, snapshots };
}

describe('MetricsService.recordReadings', () => {
  it('saves one snapshot per reading', async () => {
    const t = setup();

    await t.service.recordReadings({ unitOfWorkId: 'uow-1', taskId: 'task-1', readings: { canvas_width_px: 1080, likes: 4 } });

    expect(t.snapshots.save).toHaveBeenCalledWith([
      { unitOfWorkId: 'uow-1', taskId: 'task-1', metricKey: 'canvas_width_px', value: 1080 },
      { unitOfWorkId: 'uow-1', taskId: 'task-1', metricKey: 'likes', value: 4 },
    ]);
  });

  it('saves nothing when there are no readings', async () => {
    const t = setup();

    await t.service.recordReadings({ unitOfWorkId: 'uow-1', taskId: null, readings: {} });

    expect(t.snapshots.save).not.toHaveBeenCalled();
  });
});
