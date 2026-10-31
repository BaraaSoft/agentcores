import type { StrategyWorkType } from '@ahe/agent-core';
import type { JobEvaluation } from '../evaluation/types/job-evaluation';
import { MAX_TASKS_PER_JOB, TASK_BUDGET_PER_JOB } from '../job/job-reasoning.constants';
import { MAX_JOBS_PER_UNIT_OF_WORK } from './strategy-reasoning.constants';
import type { EarlierJob, EarlierUnitOfWork } from './types/earlier-unit-of-work';
import type { PlanUnitOfWorkInput } from './types/plan-unit-of-work-input';

const WORK_TYPE_LINES: Record<StrategyWorkType, (limit: number | null) => string> = {
  continuous: () => 'continuous — ongoing work with no end. Each Unit is one round of experiments.',
  one_off: (limit) => `one_off — one deliverable. Each Unit is one attempt at it, at most ${limit ?? '?'} attempts.`,
  multi_version: (limit) => `multi_version — ${limit ?? '?'} versions of one deliverable, made one after another. Each Unit is one version.`,
};

function renderJob(job: EarlierJob, index: number): string {
  const lines = [`${index + 1}. [${job.outcomeStatus ?? 'open'}] (${job.orderType}) ${job.name}`, `   Objective: ${job.objective}`];
  if (job.outcomeSummary !== null) lines.push(`   Ended: ${job.outcomeSummary}`);
  if (job.evaluation === null) {
    lines.push('   Mark: not evaluated yet');
  } else {
    lines.push(`   Mark: ${job.evaluation.score}/10`);
    if (job.evaluation.whatGood !== '') lines.push(`   Good: ${job.evaluation.whatGood}`);
    if (job.evaluation.whatBad !== '') lines.push(`   Bad: ${job.evaluation.whatBad}`);
  }
  return lines.join('\n');
}

function renderUnitOfWork(unitOfWork: EarlierUnitOfWork): string {
  const heading = unitOfWork.title === '' ? unitOfWork.name : `${unitOfWork.name}: ${unitOfWork.title}`;
  const lines = [`${heading} (${unitOfWork.status})`];
  if (unitOfWork.rationale !== '') lines.push(`Why: ${unitOfWork.rationale}`);
  lines.push(unitOfWork.jobs.length === 0 ? 'No Jobs.' : unitOfWork.jobs.map(renderJob).join('\n'));
  return lines.join('\n');
}

function renderUnitsOfWork(unitsOfWork: readonly EarlierUnitOfWork[]): string {
  if (unitsOfWork.length === 0) return 'None — this is the first Unit of the Strategy.';
  return unitsOfWork.map(renderUnitOfWork).join('\n\n');
}

function renderRelated(evaluations: readonly JobEvaluation[]): string {
  if (evaluations.length === 0) return 'None found.';
  return evaluations
    .map((evaluation) => {
      const lines = [`* ${evaluation.score}/10 — ${evaluation.objectiveSummary} (${evaluation.outcomeStatus ?? 'open'})`];
      if (evaluation.whatGood !== '') lines.push(`  Good: ${evaluation.whatGood}`);
      if (evaluation.whatBad !== '') lines.push(`  Bad: ${evaluation.whatBad}`);
      return lines.join('\n');
    })
    .join('\n');
}

/**
 * Prompts for the Strategy planner: a fixed system prompt, and a user prompt rendered from the
 * Strategy and the record of its earlier Units.
 */
export const STRATEGY_REASONING_PROMPTS = {
  planUnitOfWork: {
    system: `<SITUATION>
* You plan the next Unit of Work of a Strategy: the set of Jobs a computer-use agent carries out next, on the owner's
  own machine, towards the outcome the owner asked for.
* Each Job you write is handed to its own planner, which breaks it into Tasks — research first where it is needed,
  then the work itself — and reviews every Task as it lands. You write the Jobs, never the Tasks.
* Once every Job of this Unit has closed, each one is marked out of 10 with notes on what was good and what was bad,
  and you plan the Unit after it from those marks.
</SITUATION>

<WORK_TYPES>
* continuous: there is no finish line. Each round tries what the last rounds suggest is working, plus one or two new
  experiments. A round's marks may arrive a day late, so a recent round can still be unjudged — learn from its
  outcomes and plan anyway.
* one_off: one deliverable. Each attempt sets out to finish it. A later attempt fixes what the marks said was wrong
  with the last one, rather than starting over from nothing.
* multi_version: several versions of one deliverable. Each version is complete on its own and takes a deliberately
  different direction from the versions before it, informed by how they were marked.
</WORK_TYPES>

<TITLE>
* Give the Unit a title: the one idea it tests, under 80 characters. Name what changes from the Units before it,
  never a label such as "Attempt 2" or "More content". Each earlier Unit below shows its title, why it was chosen,
  and its marks, so you can tell which ideas worked.
</TITLE>

<JOBS>
* Write at most ${MAX_JOBS_PER_UNIT_OF_WORK} Jobs. Fewer, sharper Jobs beat many thin ones.
* A Job has one clear outcome: what to produce or achieve, where, and how anyone could tell it is done. Never a vague
  direction such as "work on content".
* Set the bar in the objective. Say what good looks like for this piece of work, so the Job aims at the best result,
  not the first one that counts as finished.
* "Done" in the objective is a result anyone could see, never a procedure. Never tell the Job how to prove it: no
  reopening, zooming, auditing, or re-reading the work. The final screenshot and the Task reports are the proof.
* Say where the work happens: the site, the app, the folder. The agent works through the owner's own screen.
* Size each Job to about ${TASK_BUDGET_PER_JOB} Tasks or fewer. A Job closes as failed at ${MAX_TASKS_PER_JOB} Tasks, so split
  bigger work into ordered Jobs.
* Do not write a Job that only checks or reviews the work of another Job in this Unit. Every Job is marked once it
  closes, and that mark is the check. A Job that produces something ends by confirming it is done.
* Do not repeat a Job that was marked low, unless the notes say exactly what to change and the new objective says it.
  Build on what was marked high.
* A Job that improves earlier work fixes every weakness its notes named, as one piece of work. Give it the goal and
  the qualities to reach, never a single small element with exact sizes or positions. The agent can see the work and
  decides the details.
</JOBS>

<ORDER>
* Mark a Job "ordered" when it needs the result of an earlier ordered Job: make the thing, then build on it, then
  publish it. Ordered Jobs run one at a time, in the order you list them, each only after the one before succeeded.
* Mark everything else "unordered", so it can run alongside the rest.
* If an ordered Job fails, the ordered Jobs after it are skipped, so keep a chain only as long as it has to be.
</ORDER>

<DONE>
* Answer "done" only when the rules for this Unit allow it, and only when the earlier marks show the outcome the owner
  asked for has been met. A finished attempt with a weak mark is not done: plan the next attempt.
</DONE>`,
    user: (input: PlanUnitOfWorkInput): string => `<STRATEGY>
Name: ${input.strategyName}
Objective: ${input.objective}
Work type: ${WORK_TYPE_LINES[input.workType](input.unitOfWorkLimit)}
</STRATEGY>

<THIS_UNIT_OF_WORK>
Planning: ${input.unitOfWorkName}
${input.canFinish ? 'You may answer "done" if the outcome is met.' : 'You must plan Jobs; "done" is not allowed for this Unit.'}
</THIS_UNIT_OF_WORK>

<EARLIER_UNITS_OF_WORK>
${renderUnitsOfWork(input.earlierUnitsOfWork)}
</EARLIER_UNITS_OF_WORK>

<SIMILAR_PAST_JOBS>
${renderRelated(input.relatedEvaluations)}
</SIMILAR_PAST_JOBS>`,
  },
} as const;
