/** Input of TaskReportParser.parse: how the tool loop ended. */
export interface ParseTaskReportInput {
  /** Input of the model's `submit_task_report` call, or null when it never called it. */
  readonly report: unknown;
  /** All text of the model's last message, or null when it never replied. */
  readonly finalText: string | null;
  /** True when the loop ran out of steps rather than the model finishing. */
  readonly isStoppedAtStepLimit: boolean;
  /** Values that must never appear in the result, e.g. the account password. */
  readonly secrets: readonly string[];
}
