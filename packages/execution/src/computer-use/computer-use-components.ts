import type Anthropic from '@anthropic-ai/sdk';
import type { ActionGuard } from '../actions/action-guard';
import type { TaskReportParser } from '../task-report/task-report-parser';
import type { DesktopDriver } from '../driver/desktop-driver';

/**
 * The parts the computer-use loop is assembled from. Passed in rather than
 * created inside, so tests can replace the real machine and the API with fakes.
 */
export interface ComputerUseComponents {
  readonly client: Anthropic;
  readonly desktop: DesktopDriver;
  readonly guard: ActionGuard;
  readonly reportParser: TaskReportParser;
}
