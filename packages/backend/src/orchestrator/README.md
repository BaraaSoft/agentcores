# Orchestrator

The orchestrator is the control plane of the AHE runtime. Every minute it looks at each running Workflow,
moves that run forward one step, and starts the Jobs that are ready. It is the only place
that **creates Units of Work** and the only place that **decides when an evaluation starts**. It never
queues Tasks: a queued Job queues its own Tasks, one at a time (see
[governance/processors/README.md](../governance/processors/README.md)).

- [The model](#the-model)
- [Runs: one Strategy, many Workflows](#runs-one-strategy-many-workflows)
- [Work types](#work-types)
- [How the work keeps moving](#how-the-work-keeps-moving)
- [The scheduling pass](#the-scheduling-pass)
- [Unit of Work status](#unit-of-work-status)
- [Job order](#job-order)
- [When work is evaluated](#when-work-is-evaluated)
- [Planning a Unit](#planning-a-unit)
- [Guarantees](#guarantees)
- [Out of scope for now](#out-of-scope-for-now)
- [Folder layout](#folder-layout)

---

## The model

> **A Strategy is only a reusable goal. Each Workflow is one run of it: running, paused, or done.**

```text
Strategy           what the owner wants, and how the work repeats (its work type): a reusable goal
 └ Workflow        one run of the Strategy on one machine: running, paused, or done
    └ Unit of Work one round, attempt, or version of that run: a group of Jobs, nothing more
       └ Job       one objective, planned and reviewed by Job reasoning
          └ Task   one action on the screen
```

A **Strategy** has no state of its own. It never completes: it is the goal, and it can run again at any
time. A **Workflow** is one run of it. It holds the resource envelope (`maxConcurrentJobs`), the machine,
and the run's state. Every Unit of Work belongs to one Workflow (`units_of_work.workflowId`), so each run
counts its own attempts from 1.

A **Unit of Work only groups Jobs.** Nothing reasons about a Unit: it has no success criteria and no
share of effort. The orchestrator creates one when the run has no open Unit, the planner fills it
with Jobs, and it is evaluated as a whole once all its Jobs are closed. The next Unit learns from those
evaluations.

---

## Runs: one Strategy, many Workflows

The Workflow state is `running`, `paused`, or `done`:

```mermaid
stateDiagram-v2
    [*] --> running: POST /strategies (first run) or POST /strategies/:id/run (a fresh run)
    running --> paused: the owner pauses it, or another run starts on the machine
    paused --> running: the owner resumes it
    running --> done: the stop rule ends a one_off or multi_version run
    done --> [*]
```

- **`done` is final.** Only `one_off` and `multi_version` runs reach it, when the stop rule says the run
  has no more work. A `done` run frees the machine. `startWorkflow` refuses it with "This run is done. Run
  the strategy again to start a fresh one."
- **A `continuous` run only runs or pauses.** It has no limit, so it never reaches `done`.
- **There is no "run again" on a Workflow.** To run a Strategy again, `POST /strategies/:id/run` creates a
  new Workflow and starts it. The new run begins at attempt 1 (or round 1, or version 1), and the planner
  sees what the earlier runs learned (see [Planning a Unit](#planning-a-unit)).
- **One machine runs one Workflow at a time.** The agent controls the screen. Before a Workflow starts,
  `startWorkflow` pauses every other running Workflow on the same machine.

### What a pause stops

A pause is a cascade. `pauseWorkflow` sets the Workflow to `paused` and calls `setRunState(workflowId,
'paused')`, which pauses every Unit of Work of the run. The processors check the Unit's `state`, so:

1. The pass skips the paused Workflow. It opens no Unit and queues no Job.
2. A queued Job or Task of the run is skipped when the worker picks it up.
3. A running Task stops before its next step. `TaskExecutionProcessor` calls `isTaskPaused` before each
   step. When the run is paused, it ends the Task as `failed` with the reason "Paused by the owner after N
   steps. The last step: …". The Job review plans from there when the run resumes.

So the machine is free once the current step ends. `GET /workflows` returns `activeTaskCount` for each
Workflow, and the UI waits until the paused Workflow has none. A resume calls `setRunState(workflowId,
'running')`, and the work goes on from where it stopped.

### Finding stray Tasks

At the end of every pass, `reportStrayRunningTasks` logs each `running` Task that does not belong to
running work. `TaskService.listStrayRunningTasks` finds them, and `describeStrayTask` writes one line per
Task with the reasons and every id. Search the backend log for `[stray-task]`:

```text
[stray-task] Task 5f1… "Post the draft" is running, but its Job is closed (success). Job 9a2… "Post", Unit of Work 3c7… "Attempt 1", Workflow 71d….
```

| The Task is running, but | Level |
| --- | --- |
| its run was paused less than `PAUSE_STEP_GRACE_MS` (10 min) ago, so it ends its current step | `warn` |
| its run was paused longer ago than that | `error` |
| its Job is closed, or its Workflow is `done` | `error` |
| its row names another Workflow than its Unit of Work | `error` |
| it has no start time, or it started more than `STUCK_TASK_MS` (30 min) ago | `error` |

The check only logs. It changes no data, and a failed check never stops the pass.

### Repairing Tasks a stop cut off

Tasks run only in this process. So a Task still `running` when the app boots was cut off by a stop
(Ctrl+C) or a crash, and nothing will ever finish it: its Job stays active and never moves again.
`onApplicationBootstrap` calls `TaskService.failInterruptedTasks` before it starts the timer. It ends each
such Task `failed` with `INTERRUPTED_TASK_REASON` ("The backend stopped during this Task, so it may be half
done…"). The Task is then a finished Task that awaits review, so the next pass queues its Job, and Job review
plans from the state it left. This is the same path a pause takes, so a half-done step never runs again
blindly. A paused run waits for resume, as usual. A failed repair is logged and never stops the start-up.

---

## Work types

The owner picks the work type when they create the Strategy. The planner never changes it.

| Work type | Each Unit is | The next Unit opens | The run is `done` |
| --- | --- | --- | --- |
| `continuous` | a round of experiments ("Round 3") | as soon as no Unit is open; it does not wait for the last round's evaluation | never |
| `one_off` | an attempt at the outcome ("Attempt 2") | after the last attempt is evaluated, if the planner says the outcome is not met yet | when the planner says the outcome is met, or after `maxAttempts` attempts (default 3) |
| `multi_version` | one version of the outcome ("Version 2") | after the last version is evaluated | after `versionCount` versions |

- **`continuous`** is the co-worker: it tries something, checks what landed, and tries again, for as long
  as the owner lets it run. Its learning arrives one round late, which is normal for work whose results
  take a day to show.
- **`one_off`** is a single deliverable, like an edited video or a CAD model. A failed attempt does not
  end the run: the planner reads the evaluations and either declares the outcome met or plans a new
  attempt.
- **`multi_version`** is a set of alternatives made one after another, so each version learns from the
  evaluation of the one before it. A version that failed still counts towards `versionCount`: the owner
  sees every attempt, and the run stays predictable.

---

## How the work keeps moving

There is no cron and no orchestrator queue. Two things move the work, and together they keep it going
until the run is `done` or paused:

- **The pass** (this module) moves work **between** Jobs: it opens Units of Work, starts the Jobs that are
  ready, and starts evaluations. It runs on a `setInterval` timer every `SCHEDULING_INTERVAL_MS` (one
  minute), and once straight away when a Workflow starts.
- **The queue chain** (the processors) moves work **inside** a Job: each message queues the next one, so a
  Job runs from its first Task to its close without waiting for a pass.

### From boot to the first Job

1. **The app boots.** `onApplicationBootstrap` ends the Tasks a stop cut off (see above), then starts the timer. Each pass loads only the `running`
   Workflows, so with none it does nothing.
2. **`POST /workflows`** saves the Workflow as `paused`. The pass skips it, so nothing runs yet.
   `POST /strategies/:id/run` does this step and the next one in one call, for a fresh run.
3. **`POST /workflows/:id/start`** calls `startWorkflow`. It pauses any other running Workflow on the same
   machine, sets this Workflow and its Units of Work to `running`, and starts a pass at once, without
   waiting for it, because the planning model call can take a while.
4. **The first pass** plans the first Unit of Work and queues its ready Jobs on `job-execution`.
5. **Every minute after that**, the timer runs a pass for as long as the Workflow is `running`.
   `POST /workflows/:id/pause` pauses it with all its work (see [What a pause stops](#what-a-pause-stops)),
   and the pass skips it again.

### The whole loop

```mermaid
flowchart TD
    Boot(["App boots: setInterval every 60 s"]) --> Pass
    Start(["POST /workflows/:id/start"]) -->|"pass at once"| Pass

    subgraph Orchestrator["Orchestrator pass: between Jobs"]
        Pass["Pass over each running Workflow"]
        Pass --> Settle["Settle the open Unit of Work<br/>all Jobs closed → evaluating"]
        Settle --> Eval["Evaluate the due Units of Work<br/>queue one evaluate message per Job"]
        Eval --> Open["Open the next Unit of Work<br/>planner writes its Jobs"]
        Open --> Ready["Queue the ready Jobs<br/>up to maxConcurrentJobs"]
    end

    subgraph Chain["Queue chain: inside one Job"]
        JobP["JobExecutionProcessor<br/>plan, or review the last Task"]
        TaskP["TaskExecutionProcessor<br/>run one Task on the screen"]
        JobP -->|"queue the next pending Task"| TaskP
        TaskP -->|"Task complete or failed:<br/>queue the Job for review"| JobP
        JobP -->|"review closes the Job"| Closed["Job closed<br/>(success, abandoned, failed)"]
    end

    Ready -->|"job-execution"| JobP
    Eval -->|"job-evaluation"| EvalP["JobEvaluationProcessor<br/>score the Job"]
    EvalP -->|"needs evidence:<br/>queue an evidence Job"| JobP
    Closed -->|"evidence Job closed:<br/>wake the evaluation"| EvalP
    Closed -.->|"picked up by the next pass"| Pass
    EvalP -.->|"scored or failed:<br/>picked up by the next pass"| Pass
```

The solid arrows are queue messages, so they happen at once. The dotted arrows are the places where work
waits for the next pass, which is at most one minute away. The pass never queues a Task: it only queues
Jobs and evaluations.

### Who wakes what

| When this happens | What moves it on | Wait |
| --- | --- | --- |
| A Job is queued | `JobExecutionProcessor` writes the plan and queues the first pending Task | none |
| A Task completes or fails | `TaskExecutionProcessor` queues the Job, and Job reasoning reviews the Task | none |
| The review says "continue" | `JobExecutionProcessor` queues the next pending Task, or plans more Tasks | none |
| A Task is deferred | `TaskExecutionProcessor` queues the Task again with a delay | `retryAfterMinutes` |
| A Task is escalated | Nothing, until the owner answers through `POST /escalations/:id/resolve` | the owner |
| A Job closes | The next pass starts the next ordered Job, or settles the Unit of Work | up to one minute |
| Every Job of a Unit of Work is closed | The next pass moves the Unit to `evaluating` and sets `evaluateAfter` | up to one minute |
| `evaluateAfter` passes | The next pass opens the evaluations and queues them | 0 h, or 24 h for `continuous` |
| An evaluation needs evidence | `JobEvaluationProcessor` queues an evidence Job in the same Unit of Work | none |
| The evidence Job closes | `JobExecutionProcessor` wakes the waiting evaluation | none |
| Every evaluation is scored or failed | The next pass completes the Unit of Work, then opens the next one | up to one minute |

So one Job runs through all its Tasks on queue messages alone. The pass links the Jobs together: it starts
the next ordered Job, moves each Unit of Work on, and opens the next Unit of Work. A sequence of three
ordered Jobs, for example cut, colour, and export, waits at most one minute between each Job. A one-minute
gap is small next to a Task that takes minutes on the screen, and the pass stays simple: it reads state
from the database, and no processor has to call back into the orchestrator.

---

## The scheduling pass

`scheduleAllWorkflows` runs every `SCHEDULING_INTERVAL_MS` (one minute), and once straight away when a
Workflow is started. A pass never overlaps the one before it. For each `running` Workflow it does five
steps, in this order. Every count and list is for this run only:

```mermaid
flowchart TD
    A["1 · Load the Workflow and its Strategy"] --> B{"Workflow running?"}
    B -- "no: paused or done" --> Z["Nothing to do"]
    B -- yes --> C["2 · Settle the open Unit<br/>skip ordered Jobs behind a failed one<br/>all Jobs closed → evaluating"]
    C --> D["3 · Evaluate the Units that are due<br/>open one evaluation per Job<br/>all evaluations settled → complete"]
    D --> E{"4 · Is a Unit open?"}
    E -- no --> F{"Stop rule for the work type"}
    F -- "wait" --> G
    F -- "stop" --> H["Workflow → done<br/>the machine is free"]
    F -- "go on" --> I["Planner plans the Jobs<br/>Unit + Jobs saved in one transaction"]
    I --> G
    E -- yes --> G["5 · Start ready Jobs<br/>up to maxConcurrentJobs − active Jobs"]
```

The stop rule in step 4, per work type:

| Work type | A Unit is still `evaluating` | No Unit yet | Otherwise |
| --- | --- | --- | --- |
| `continuous` | go on | go on | go on |
| `one_off` | wait | go on | stop at `maxAttempts`; else ask the planner, which may answer `done` (stop) |
| `multi_version` | wait | go on | stop at `versionCount`; else go on |

Step 5 queues each ready Job with its own ID as the queue job ID, so a Job that is already waiting is not
queued twice. A Job is ready when its Unit is `running` (not paused), its Unit is `open` or `evaluating`
(evidence Jobs live in an evaluating Unit, below), it is not waiting on an earlier ordered Job, and it needs
to move: no Tasks yet, a finished Task awaiting review, or a pending current Task.

---

## Unit of Work status

A Unit has two independent fields:

- `state`: `running` or `paused`. The owner's switch. A paused Unit's Jobs and Tasks are not carried out.
- `status`: `open`, `evaluating`, or `complete`. Where the Unit is in its life. Only the orchestrator moves it.

```mermaid
stateDiagram-v2
    [*] --> open: orchestrator opens the Unit with its planned Jobs
    open --> evaluating: every Job is closed, evaluateAfter = now (+24h for continuous)
    evaluating --> complete: every Job's evaluation is scored or failed
    complete --> [*]
```

A run has at most one `open` Unit. Several may be `evaluating` at once in a `continuous` run, while
the next round runs.

---

## Job order

Some work is a sequence: cut the video, then colour it, then export it. The planner marks each Job:

- `orderType: 'ordered'` with an `orderNumber` (1, 2, 3, …): the Job runs only after every ordered Job
  before it in the same Unit has closed as `success`.
- `orderType: 'unordered'` with no number: the Job runs whenever there is capacity.

Ordered and unordered Jobs can share a Unit. The rule lives in the scheduler's `listStartableJobs`, not in
the Job processor, because the scheduler decides what starts.

**When an ordered Job does not succeed**, the ordered Jobs after it cannot do their part. In step 2 the
orchestrator closes them as `abandoned` with the summary "Skipped: an earlier step did not succeed". They
never started, so they are not evaluated. The Unit then closes and is evaluated, and the next Unit learns from
the failure.

---

## When work is evaluated

The orchestrator starts every evaluation, and it evaluates a **Unit** once all its Jobs are closed. Only the
wait differs by work type:

| Work type | Wait after the Unit's last Job closes | Why |
| --- | --- | --- |
| `one_off`, `multi_version` | none | The work is an artifact. It can be evaluated now, and the next attempt or version is waiting for the mark. |
| `continuous` | 24 hours (`CONTINUOUS_EVALUATION_DELAY_MS`) | The work is mostly engagement (views, likes, replies), which takes a day to arrive. |

The wait is stored on the Unit as `evaluateAfter`, not as a delayed queue message, so it survives a restart
and the database shows when each Unit will be evaluated.

In step 3 the orchestrator opens one evaluation per Job that **ran at least one Task** and is not an
evidence Job, then queues a `evaluate` message for each. There is one evaluation per Job (`job_evaluations`
is unique on `jobId`), so running step 3 again changes nothing. From there the evaluation processor takes
over, and an evaluation that needs to see the work files an **evidence Job in the same Unit**. That is why
step 5 still starts Jobs in a `evaluating` Unit. When the evidence Job closes, the Job processor wakes the
evaluation that waits for it. That step stays in the Job processor: it continues an evaluation that has
already started, so it belongs to the evaluation's own state machine.

When every evaluation of the Unit is `scored` or `failed`, the Unit is `complete`.

---

## Planning a Unit

`StrategyReasoningService.planUnitOfWork` writes the Jobs of a new Unit in one structured call. It reads:

- the Strategy's objective and work type, and which round, attempt, or version of this run this is;
- the earlier Units of this run (the last five), each with the idea it tested and why, and each Job's
  objective, outcome, and evaluation: the score, what was good, and what was bad;
- the earlier runs of the same Strategy (the last three runs, `EARLIER_RUNS_LIMIT`), each with its last
  three Units in the same form (`EARLIER_RUN_UNITS_OF_WORK_LIMIT`). A fresh run starts at attempt 1, but it
  does not start from nothing: the planner keeps what worked and avoids what scored low;
- up to five evaluations of similar Jobs from the owner's other Strategies, found by objective. The
  Strategy's own runs are left out, because the planner already sees them.

It answers with a `title` (the one idea the Unit tests, e.g. "Shorter hook, post at 9am"), a `rationale`
(why), and up to `MAX_JOBS_PER_UNIT_OF_WORK` Jobs, each with a name, an objective, and an order type. The
`name` stays the fixed label ("Attempt 2"); the `title` and `rationale` are stored beside it. For
the second and later attempts of a `one_off` run it may answer `done` instead, when the earlier
evaluations show the outcome is met. That marks the Workflow `done`. The orchestrator saves the Unit and its Jobs in one transaction, so a
crash never leaves an open Unit with no Jobs.

---

## Guarantees

- **One open Unit per run.** Units are numbered (`sequence`) and the number is unique per Workflow, so
  two passes cannot both open Unit 3 of a run, and each fresh run starts again at 1.
- **Every move is conditional.** `open → evaluating` and `evaluating → complete` only happen from the status
  they expect. A pass can be repeated at any time.
- **A `done` run stays done.** A start refuses it, and a pause leaves it as it is.
- **One running Workflow per machine.** A start pauses the others on the machine first, with all their work.
- **A Job is queued at most once at a time**, because the queue job ID is the Job ID.
- **A Job is evaluated at most once**, because the evaluation is unique per Job and its queue job ID is the
  evaluation ID.
- **A pass never blocks the others.** An error on one Workflow is logged, and the pass goes on to the next.

---

## Out of scope for now

These parts are deliberately left out of the hackathon build. They are listed in
[docs/todo.md](../../../../docs/todo.md).

- **The 30-day cycle and the Strategy review.** Learning happens between Units, through the Job
  evaluations, so the cycle-check cron, `StrategyEvaluationService`, and the Strategy-level review are
  removed. `goldStandards` and `evaluation` stay on the Strategy for when the review comes back.
- **The budget limit.** `WorkflowResources.budgetLimit` is not enforced yet; only `maxConcurrentJobs` is.
- **The daily report.** `DAILY_REPORT_CRON` is not registered yet.
- **Several machines.** The UI fixes the machine to one Mac for now. The model allows runs on other
  machines, and the one-run-per-machine rule already counts per machine.

---

## Folder layout

```text
orchestrator/
├── describe-stray-task.ts        the log line for a running Task that does not belong to running work
├── orchestrator.constants.ts     pass interval, evaluation delay, per-Unit limits, Unit names, stray-Task limits
├── orchestrator.module.ts        exports OrchestratorService; the start and pause routes are in api/workflows
├── orchestrator.service.ts       the scheduling pass
├── tests/
│   ├── describe-stray-task.spec.ts
│   └── orchestrator.service.spec.ts
└── types/
    └── scheduling-result.ts
```
