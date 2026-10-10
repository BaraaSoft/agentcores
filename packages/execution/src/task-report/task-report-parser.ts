import type { ExecutionBlocker, ExecutionResult } from '@ahe/agent-core';
import { TASK_REPORT_SCHEMA } from './task-report.schema';
import type { TaskReport } from './task-report.schema';
import type { ParseTaskReportInput } from './types/parse-task-report-input';

const MAX_SUMMARY_LENGTH = 900;
const MAX_FIELD_LENGTH = 300;
const REDACTED = '[redacted]';

/** An ExecutionResult before the provider adds the step count. */
type ReportedOutcome = Omit<ExecutionResult, 'stepsTaken'>;

/**
 * Turns the end of the tool loop into the text-only outcome that leaves the execution layer.
 *
 * The model ends a task by calling the strict `submit_task_report` tool, so the screen is summarised in the
 * same conversation that saw it — no extra model call, and no screenshot ever leaves the package.
 * The API enforces the schema; it is checked again here so a missing or malformed report becomes
 * a `failed` result, never a crash. Every returned string has the task's secrets redacted.
 */
export class TaskReportParser {
  parse(input: ParseTaskReportInput): ReportedOutcome {
    const state = this.parseUnredacted(input);
    return this.redact(state, input.secrets.filter((secret) => secret.length > 0));
  }

  private parseUnredacted({ report, finalText, isStoppedAtStepLimit }: ParseTaskReportInput): ReportedOutcome {
    if (report !== null) {
      const parsed = TASK_REPORT_SCHEMA.safeParse(report);
      return parsed.success ? this.fromReport(parsed.data) : this.failure('The task report did not match its schema.');
    }
    if (isStoppedAtStepLimit) {
      return this.failure('Stopped at the step limit before the instruction was finished.');
    }
    if (finalText === null) {
      return this.failure('The execution model never replied.');
    }
    return this.failure(`Finished without a task report: ${finalText.trim()}`);
  }

  private fromReport(report: TaskReport): ReportedOutcome {
    return {
      status: report.status,
      summary: this.truncate(report.summary, MAX_SUMMARY_LENGTH),
      finalLocation: this.truncate(report.finalLocation, MAX_FIELD_LENGTH),
      blocker: report.status === 'blocked' ? this.readBlocker(report) : null,
      metricReadings: this.readMetrics(report.metricReadings),
    };
  }

  /** A `blocked` report always carries a blocker; without one, the summary stands in as its detail. */
  private readBlocker(report: TaskReport): ExecutionBlocker {
    const blocker = report.blocker ?? { kind: 'other', detail: report.summary };
    return { kind: blocker.kind, detail: this.truncate(blocker.detail, MAX_FIELD_LENGTH) };
  }

  /** A repeated name keeps its last value. */
  private readMetrics(readings: TaskReport['metricReadings']): Readonly<Record<string, number>> {
    return Object.fromEntries(readings.map((reading) => [reading.name, reading.value]));
  }

  private redact(state: ReportedOutcome, secrets: readonly string[]): ReportedOutcome {
    if (secrets.length === 0) {
      return state;
    }
    const clean = (text: string): string => secrets.reduce((result, secret) => result.split(secret).join(REDACTED), text);
    return {
      ...state,
      summary: clean(state.summary),
      finalLocation: clean(state.finalLocation),
      blocker: state.blocker === null ? null : { ...state.blocker, detail: clean(state.blocker.detail) },
    };
  }

  private failure(summary: string): ReportedOutcome {
    return {
      status: 'failed',
      summary: this.truncate(summary, MAX_SUMMARY_LENGTH),
      finalLocation: '',
      blocker: null,
      metricReadings: {},
    };
  }

  private truncate(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
  }
}
