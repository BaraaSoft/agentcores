/** Values Muse writes in `blocker` when it means "no blocker". */
const EMPTY_BLOCKERS: readonly unknown[] = ['null', 'none', ''];

/**
 * Repairs the two ways a Muse task report breaks the report schema, before TaskReportParser checks it.
 * Meta's API does not enforce strict tool schemas, so Muse writes `blocker: "null"` as a string, and puts text
 * such as "4821-QX" in a numeric metric. The blocker becomes null; a metric becomes a number or is dropped.
 * Everything else is left for the parser to accept or reject.
 */
export function normalizeMuseReport(report: unknown): unknown {
  if (typeof report !== 'object' || report === null) return report;
  const { blocker, metricReadings, ...rest } = report as Record<string, unknown>;
  return {
    ...rest,
    blocker: EMPTY_BLOCKERS.includes(blocker) ? null : blocker,
    metricReadings: Array.isArray(metricReadings) ? metricReadings.flatMap(numericReading) : metricReadings,
  };
}

/** The reading with its value as a number, or nothing when the value is not a number. */
function numericReading(reading: unknown): unknown[] {
  if (typeof reading !== 'object' || reading === null) return [];
  const { value } = reading as { value?: unknown };
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? [{ ...reading, value: number }] : [];
}
