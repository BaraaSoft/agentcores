import { Injectable } from '@nestjs/common';

/** The tool that ends an execution step. It reports; it is not a screen action. */
const REPORT_TOOL_NAME = 'submit_task_report';

/**
 * Counts the screen actions of the execution step that runs now, so the step log can show how many actions
 * the model sends per turn. The execution provider's `onTurn` feeds it; the Task processor starts it before
 * each step and reads it after. Steps run one at a time (the Task worker's concurrency is 1), so one meter
 * serves them all. It works the same for every provider.
 */
@Injectable()
export class ExecutionPaceMeter {
  private actions = 0;

  /** Starts the count for a new step. */
  start(): void {
    this.actions = 0;
  }

  /** Adds one model turn's tool calls, each written as `name {input}`, leaving out the report. */
  recordTurn(toolCalls: readonly string[]): void {
    this.actions += toolCalls.filter((call) => call.split(' ', 1)[0] !== REPORT_TOOL_NAME).length;
  }

  /** The screen actions counted since `start`. */
  get actionsTaken(): number {
    return this.actions;
  }
}
