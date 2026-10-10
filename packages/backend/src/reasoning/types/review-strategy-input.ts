import type { GoldStandards, UnitMeasurement } from '@ahe/agent-core';

/**
 * Everything needed to grade a Strategy at the end of its cycle.
 */
export interface ReviewStrategyInput {
  readonly strategyName: string;
  readonly goldStandards: GoldStandards;
  readonly goldStandardValues: Readonly<Record<string, number>>;
  readonly unitMeasurements: readonly UnitMeasurement[];
}
