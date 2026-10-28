import type { TaskOutcome } from './job/types/task-outcome';

/**
 * Renders one Task outcome as prompt text, under a label such as `1.` or `Just finished:`.
 */
export function renderTaskOutcome(outcome: TaskOutcome, label: string): string {
  const lines = [`${label} [${outcome.status}] ${outcome.action}`];
  if (outcome.result !== null) {
    lines.push(`   Result: ${outcome.result.summary}`);
    const readings = Object.entries(outcome.result.metricReadings);
    if (readings.length > 0) lines.push(`   Metrics: ${readings.map(([name, value]) => `${name}=${value}`).join(', ')}`);
  }
  if (outcome.failureReason !== null) lines.push(`   Failure: ${outcome.failureReason}`);
  if (outcome.locationPath !== null) lines.push(`   Location: ${outcome.locationPath}`);
  if (outcome.locationDetails !== null) lines.push(`   How to get there: ${outcome.locationDetails}`);
  return lines.join('\n');
}

/**
 * Renders a numbered list of Task outcomes, or `empty` when there are none.
 */
export function renderTaskOutcomes(outcomes: readonly TaskOutcome[], empty: string): string {
  if (outcomes.length === 0) return empty;
  return outcomes.map((outcome, index) => renderTaskOutcome(outcome, `${index + 1}.`)).join('\n');
}
