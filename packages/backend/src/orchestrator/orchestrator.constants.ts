import type { StrategyWorkType } from '@agentcores/agent-core';

/** How often the orchestrator runs its scheduling pass. */
export const SCHEDULING_INTERVAL_MS = 60_000;

/** How long a `continuous` Unit waits after its last Job closes before it is evaluated, so engagement can arrive. */
export const CONTINUOUS_EVALUATION_DELAY_MS = 24 * 60 * 60 * 1000;

/** Earlier Units of Work of this run the planner reads, most recent ones. */
export const EARLIER_UNITS_OF_WORK_LIMIT = 5;

/** Earlier runs of the Strategy the planner reads, most recent ones. */
export const EARLIER_RUNS_LIMIT = 3;

/** Units of Work of each earlier run the planner reads, its last ones. */
export const EARLIER_RUN_UNITS_OF_WORK_LIMIT = 3;

/** Evaluations of similar Jobs from the owner's other Strategies the planner reads. */
export const RELATED_EVALUATIONS_LIMIT = 5;

/** What each Unit of Work is called, by work type: "Round 3", "Attempt 2", "Version 1". */
export const UNIT_OF_WORK_NAME_PREFIXES: Record<StrategyWorkType, string> = {
  continuous: 'Round',
  one_off: 'Attempt',
  multi_version: 'Version',
};

/** A Task running longer than this is logged as stray: the worker may have stopped without closing it. */
export const STUCK_TASK_MS = 30 * 60_000;

/** Why a Task still `running` at start-up ended `failed`. Job review reads it before it plans the next Task. */
export const INTERRUPTED_TASK_REASON =
  'The backend stopped during this Task, so it may be half done. Check what is already on the screen before you repeat any of it.';

/** After a pause, a running Task may take this long to end its current step before it is logged as an error. */
export const PAUSE_STEP_GRACE_MS = 10 * 60_000;

/** Daily report time (cron, Mac Mini local time). Not registered yet. */
export const DAILY_REPORT_CRON = '0 21 * * *';
