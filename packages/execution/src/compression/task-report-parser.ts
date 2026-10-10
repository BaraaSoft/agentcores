import { BLOCKER_KINDS, EXECUTION_STATUSES } from '@ahe/agent-core';
import type { BlockerKind, ExecutionBlocker, ExecutionStatus } from '@ahe/agent-core';
import type { CompressedState } from './compressed-state';

const REPORT_PATTERN = /<task_report>([\s\S]*?)<\/task_report>/;
const MAX_SUMMARY_LENGTH = 900;
const MAX_FIELD_LENGTH = 300;
const REDACTED = '[redacted]';

/**
 * Turns the execution model's final reply into a CompressedState.
 *
 * The system prompt asks the model to end with a `<task_report>{…}</task_report>` JSON block,
 * so compression happens in the same conversation that saw the screen — no extra model call,
 * and no screenshot ever leaves the package. Anything malformed becomes a `failed` result, never a crash.
 * Every returned string has the task's secrets (e.g. the account password) redacted.
 */
export class TaskReportParser {
  /**
   * @param finalText all text of the model's last message
   * @param isStoppedAtStepLimit true when the loop ended because it ran out of steps, not because the model finished
   * @param secrets values that must never appear in the result
   */
  parse(finalText: string | null, isStoppedAtStepLimit: boolean, secrets: readonly string[] = []): CompressedState {
    const state = this.parseUnredacted(finalText, isStoppedAtStepLimit);
    return this.redact(state, secrets.filter((secret) => secret.length > 0));
  }

  private parseUnredacted(finalText: string | null, isStoppedAtStepLimit: boolean): CompressedState {
    if (isStoppedAtStepLimit) {
      return this.failure('Stopped at the step limit before the instruction was finished.');
    }
    if (finalText === null) {
      return this.failure('The execution model never replied.');
    }

    const match = REPORT_PATTERN.exec(finalText);
    if (match === null) {
      return this.failure(`Finished without a task report: ${finalText.trim()}`);
    }

    try {
      return this.fromJson(JSON.parse(match[1]));
    } catch {
      return this.failure('The task report was not valid JSON.');
    }
  }

  /** Reads the report fields, keeping only well-typed values. */
  private fromJson(report: unknown): CompressedState {
    if (typeof report !== 'object' || report === null) {
      return this.failure('The task report was not a JSON object.');
    }
    const fields = report as Record<string, unknown>;
    const status = this.readStatus(fields.status);
    const summary = typeof fields.summary === 'string' ? fields.summary : 'No summary given.';

    return {
      status,
      summary: this.truncate(summary, MAX_SUMMARY_LENGTH),
      finalLocation: typeof fields.finalLocation === 'string' ? this.truncate(fields.finalLocation, MAX_FIELD_LENGTH) : '',
      blocker: status === 'blocked' ? this.readBlocker(fields.blocker, summary) : null,
      metricReadings: this.readMetrics(fields.metricReadings),
    };
  }

  /** Unknown statuses count as `failed`, so a garbled report never reads as success. */
  private readStatus(value: unknown): ExecutionStatus {
    return EXECUTION_STATUSES.includes(value as ExecutionStatus) ? (value as ExecutionStatus) : 'failed';
  }

  /** A `blocked` report always carries a blocker; a missing or unknown kind becomes `other`. */
  private readBlocker(value: unknown, summary: string): ExecutionBlocker {
    const fields = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
    const kind = BLOCKER_KINDS.includes(fields.kind as BlockerKind) ? (fields.kind as BlockerKind) : 'other';
    const detail = typeof fields.detail === 'string' ? fields.detail : summary;
    return { kind, detail: this.truncate(detail, MAX_FIELD_LENGTH) };
  }

  /** Keeps only entries whose value is a finite number. */
  private readMetrics(value: unknown): Readonly<Record<string, number>> {
    if (typeof value !== 'object' || value === null) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, number] => Number.isFinite(entry[1])),
    );
  }

  private redact(state: CompressedState, secrets: readonly string[]): CompressedState {
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

  private failure(summary: string): CompressedState {
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
