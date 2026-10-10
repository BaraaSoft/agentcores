import type { UnitMeasurement } from '@ahe/agent-core';
import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetricSnapshotEntity } from '../entities/metric-snapshot.entity';
import type { StrategyEntity } from '../entities/strategy.entity';
import type { MeasureUnitInput } from '../types/measure-unit-input';
import type { RecordReadingsInput } from '../types/record-readings-input';
import { UnitOfWorkService } from './unit-of-work.service';

/**
 * The success-metrics chain: stores readings from Tasks, rolls them up per Unit,
 * and reads the gold-standard numbers a Strategy is graded on.
 */
@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MetricSnapshotEntity)
    private readonly snapshots: Repository<MetricSnapshotEntity>,
    private readonly units: UnitOfWorkService,
  ) {}

  /**
   * Saves one snapshot per metric reading.
   */
  async recordReadings(input: RecordReadingsInput): Promise<void> {
    throw new NotImplementedException();
  }

  /**
   * Aggregates a Unit's snapshots over a window and compares them to its success criteria.
   */
  async measureUnit(input: MeasureUnitInput): Promise<UnitMeasurement> {
    throw new NotImplementedException();
  }

  /**
   * Measures every active Unit of a Strategy over the same window.
   */
  async measureStrategy(strategyId: string, periodStart: Date, periodEnd: Date): Promise<UnitMeasurement[]> {
    throw new NotImplementedException();
  }

  /**
   * Current values of the Strategy's gold-standard metrics (HE signups, paying customers).
   * These come from HumanExperiences itself, not from the screen.
   */
  async readGoldStandardValues(strategy: StrategyEntity): Promise<Record<string, number>> {
    throw new NotImplementedException();
  }
}
