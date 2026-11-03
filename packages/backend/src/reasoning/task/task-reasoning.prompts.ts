import { renderTaskOutcomes } from '../task-outcome.prompts';
import type { StepRecord } from './types/step-record';
import type { TaskReasoningInput } from './types/task-reasoning-input';

function renderStep(step: StepRecord, index: number): string {
  const { result } = step;
  const lines = [`${index + 1}. [${result.status}] ${step.instruction}`];
  if (step.platform !== null) lines.push(`   Platform: ${step.platform}`);
  lines.push(`   Result: ${result.summary || 'No summary.'}`);
  if (result.blocker !== null) lines.push(`   Blocker: ${result.blocker.kind} — ${result.blocker.detail}`);
  const readings = Object.entries(result.metricReadings);
  if (readings.length > 0) lines.push(`   Metrics: ${readings.map(([name, value]) => `${name}=${value}`).join(', ')}`);
  if (result.locationPath !== '') lines.push(`   Location: ${result.locationPath}`);
  if (result.locationDetails !== '') lines.push(`   How to get there: ${result.locationDetails}`);
  return lines.join('\n');
}

/** The Job's later Tasks, with the rule that keeps this Task's steps off their work. */
function renderLaterTasks(laterTasks: readonly string[]): string {
  if (laterTasks.length === 0) return 'None — this is the last planned Task of the Job.';
  const list = laterTasks.map((action, index) => `${index + 1}. ${action}`).join('\n');
  return `${list}\nThis work is left for those Tasks. Plan no step that starts it, and mark this Task done once its own action is done.`;
}

/**
 * Renders the Task, the owner context, the Job's earlier and later Tasks, every step so far, and the account
 * pressure as tagged text.
 * Every Task reasoning method reads this same block.
 */
function renderTaskInput(input: TaskReasoningInput): string {
  return `<TASK>
Action: ${input.taskAction}
Job objective: ${input.jobObjective}
</TASK>

<OWNER_CONTEXT>
${input.safeContext || 'None.'}
</OWNER_CONTEXT>

<EARLIER_TASKS_IN_THIS_JOB>
${renderTaskOutcomes(input.earlierTasks, 'None — this is the first Task of the Job.')}
</EARLIER_TASKS_IN_THIS_JOB>

<LATER_TASKS_IN_THIS_JOB>
${renderLaterTasks(input.laterTasks)}
</LATER_TASKS_IN_THIS_JOB>

<STEPS_SO_FAR>
${input.history.length === 0 ? 'None — this is the first step.' : input.history.map(renderStep).join('\n')}
</STEPS_SO_FAR>

<ACCOUNT_PRESSURE>
Gates this account hit in the last 24 hours: ${input.recentChallengeCount}
</ACCOUNT_PRESSURE>`;
}

/**
 * Prompts for Task-level reasoning. `planNextStep` renders the user prompt from its input; its system
 * prompt comes from the Task's skill (see `skills/`). `decideOnBlocker` is a placeholder: it is not built yet.
 */
export const TASK_REASONING_PROMPTS = {
  planNextStep: {
    user: (input: TaskReasoningInput): string => renderTaskInput(input),
  },
  decideOnBlocker: `<SITUATION>
* A platform gate (a CAPTCHA, a verification code, a rate limit, an account check) stopped the last step in the history.
</SITUATION>

<RULES>
* Never plan to bypass or solve the gate. Find a path that avoids it.
* Ask the owner only when the gate is theirs to clear, such as a verification code or an identity check.
* Moving the work to another platform is not your call; the Unit of Work decides that.
* Record what triggered the gate so future pacing avoids it.
</RULES>

<EXAMPLES>
Be creative; these are examples, not a menu:
* Wait out a rate limit and retry later.
* Reach the same goal through another page or flow.
* Do the step through the platform's official API.
* Give up when the Task is not worth pursuing.
</EXAMPLES>

TODO`,
} as const;
