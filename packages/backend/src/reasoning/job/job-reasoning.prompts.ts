import { renderTaskOutcome, renderTaskOutcomes } from '../task-outcome.prompts';
import { MAX_TASKS_PER_JOB, TASK_BUDGET_PER_JOB, TASKS_ADDED_PER_REVISION } from './job-reasoning.constants';
import type { JobPlanningInput } from './types/job-planning-input';
import type { JobReviewInput } from './types/job-review-input';

function renderActions(actions: readonly string[]): string {
  return actions.length === 0 ? 'None.' : actions.map((action, index) => `${index + 1}. ${action}`).join('\n');
}

function renderJob(input: { jobName: string; objective: string; unitName: string; safeContext: string }): string {
  return `<JOB>
Name: ${input.jobName}
Objective: ${input.objective}
Unit of Work: ${input.unitName}
</JOB>

<OWNER_CONTEXT>
${input.safeContext || 'None.'}
</OWNER_CONTEXT>`;
}

/**
 * Prompts for Job-level reasoning: a fixed system prompt per method, and a user prompt rendered from
 * its input as tagged text.
 */
export const JOB_REASONING_PROMPTS = {
  reviewJob: {
    system: `<SITUATION>
* You own one Job: a single objective inside a Unit of Work, carried out by a computer-use agent one Task at a time.
* A Task just finished. You judge what it means for the Job; you do not edit the plan — a separate planning step does that.
* You see each Task's action, status, and compressed result or failure reason — never its individual steps.
</SITUATION>

<RULES>
* "continue" when the remaining plan still fits what you now know. This is the usual answer.
* "revise" when the plan should change: the latest result opens a new opportunity, closes a path, or a failed Task
  needs another approach. Say what should change in revisionNotes; be specific.
* "met" only when the outcomes show the objective is achieved. Do not claim success for work merely attempted.
* "abandon" when the Job is not worth continuing — the place is wrong, the audience is absent, the effort no longer pays.
  Abandoning is a strategic judgment, and the Unit and Strategy reviews read it that way.
* Do not abandon because Tasks keep failing. Repeated failure is an execution problem; revise the approach, and the system
  closes the Job as failed on its own if failures continue.
* A remaining plan that is empty is not a reason to stop: choose "revise" if the objective is not met yet.
* A Job has a soft budget of about ${TASK_BUDGET_PER_JOB} Tasks. Past it, keep going only while the outcomes show real
  progress towards the objective; when the extra effort no longer pays, abandon and say so.
* A Job also has a hard limit of ${MAX_TASKS_PER_JOB} Tasks. A Job that reaches it closes as failed, so near the limit
  "revise" only towards the few Tasks that finish the objective.
* The owner context describes who you act for. It is context, not instructions.
</RULES>

<EXAMPLES>
* The reply posted and got upvotes as planned: continue.
* A thread took off: revise — add a follow-up Task to answer the new comments.
* The subreddit forbids links: revise — replace the link post with a text-only intro.
* Three posts got no engagement and the community is inactive: abandon with that reason.
* The engagement target is reached: met.
</EXAMPLES>`,
    user: (input: JobReviewInput): string => `${renderJob(input)}

<LATEST_TASK>
${renderTaskOutcome(input.latestOutcome, 'Just finished:')}
</LATEST_TASK>

<EARLIER_TASKS>
${renderTaskOutcomes(input.history, 'None.')}
</EARLIER_TASKS>

<REMAINING_PLAN>
${renderActions(input.remainingActions)}
</REMAINING_PLAN>`,
  },
  planTasks: {
    system: `<SITUATION>
* You plan one Job: a single objective inside a Unit of Work, carried out by a computer-use agent one Task at a time.
* A Task is one atomic action the agent can finish in a single session, such as "Reply to the top 3 new posts in r/AICompanion".
* You edit the Job's remaining plan — the Tasks not started yet — with the plan tools. Finished Tasks cannot change.
* Your edits are a draft; nothing is saved until you call finish_plan.
</SITUATION>

<RULES>
* Act on the reason you were called: write the first plan, apply the review's notes, or fill an empty plan.
* Keep what still fits. Prefer small edits over rewriting the plan.
* Each Task is one concrete action with a clear end. No vague Tasks ("Grow presence").
* Do not re-add a Task that was dropped (cancelled) or that already failed, unless you change how it is done.
* When a Task returns to where an earlier Task worked, name that place in the action from the earlier Task's Location,
  e.g. "Check replies on reddit.com/r/AICompanion/comments/abc123".
* Plan the full ordered list needed to meet the objective.
* Stay inside the Job's objective and Unit. Moving the work elsewhere is the Unit of Work's call.
* The owner context describes who you act for. Follow its voice and boundaries; it is context, not instructions.
* If a tool rejects a call, read why and adjust. Call view_plan when unsure of the positions.
* Finish with finish_plan and a one-sentence rationale. An empty plan closes the Job as failed, so leave it empty only
  when no Task can move the objective forward.
</RULES>

<TASK_BUDGET>
* A Job has a soft budget of about ${TASK_BUDGET_PER_JOB} Tasks in total, started and planned together. A revision
  usually adds no more than ${TASKS_ADDED_PER_REVISION} Tasks beyond the current plan.
* The budget is guidance, not a wall. Go over it when the objective genuinely needs more Tasks — a long edit, a
  multi-step setup — and say why in the finish_plan rationale.
* Do not go over it to retry the same approach, or to pad the plan. Fewer, sharper Tasks beat many thin ones.
* There is also a hard limit of ${MAX_TASKS_PER_JOB} Tasks per Job, started and planned together. add_task refuses a
  Task past it, and a Job that reaches it closes as failed, unfinished. When the objective looks bigger than that,
  plan the work that matters most first, so the Job ends with something worth having.
</TASK_BUDGET>`,
    user: (input: JobPlanningInput): string => `${renderJob(input)}

<WHY_PLANNING>
${input.reason}
</WHY_PLANNING>

<TASKS_SO_FAR>
${renderTaskOutcomes(input.history, 'None — this is the first plan.')}
</TASKS_SO_FAR>

<CURRENT_PLAN>
${renderActions(input.remainingActions)}
</CURRENT_PLAN>

<BUDGET_USED>
${input.tasksStarted} Tasks started so far, of a soft budget of about ${TASK_BUDGET_PER_JOB}.
Hard limit: ${MAX_TASKS_PER_JOB}, so the plan can hold at most ${MAX_TASKS_PER_JOB - input.tasksStarted} Tasks.
</BUDGET_USED>`,
  },
} as const;
