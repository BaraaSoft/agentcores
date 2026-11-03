# AHE features log: Meta Global AI Hackathon 2026

**Build window:** 27 Oct 2026 to Thu 5 Nov 2026, 1:00 PM Sydney time (Wed 4 Nov, 9:00 PM ET).

**AHE in one line:** an AI co-worker that takes a goal, plans the work, carries it out on a real Mac, reviews
its own results, and self-improves every round.

This log lists every feature we built during the window, newest first. Each entry says what AHE can now do,
why it matters, and where it lives in the code.

## Highlights

- **It works on a real computer with Meta Muse.** Muse plans the work and clicks, types, and reads the screen.
- **It self-improves.** It reviews each piece of work from the screen, keeps what worked, and fixes what did not.
- **It runs for days.** Ongoing, one-off, and multi-version goals, with pause, resume, and run again.
- **The owner sees everything live.** A dashboard shows the plan, the running step, and the result of each Job.
- **It is measured.** A benchmark of the self-review, 479 automated tests, and CI on every change.
- **It starts with one command.** `pnpm quickstart` goes from a fresh clone to a running AHE.

---

## 4 Nov 2026

### A step that runs out of time still says what it did

Before its last turn, the screen agent now gets a note: report now, with what you finished, what is left, and
where the work is. For example, a search that runs long reports "Found the PNG on the Desktop" instead of only
"Stopped at the step limit", so the next step builds on it and does not search again.

- **Why it matters:** the agent stops repeating work it already did, which wasted many minutes in a live run.
- **Where:** the Muse screen loop in `packages/execution/src/muse/`.

---

## 3 Nov 2026

### A benchmark proves that the self-review tells strong work from weak work

`pnpm eval` runs AHE's real reviewer on 16 sample Jobs, 3 times each. Each sample comes in a strong and a weak
version, for example a calendar invite booked right, and one booked on the wrong day.

- **Result:** it never ranked the weak version above the strong one, and the gap was 5.38 points on average.
  It judged a real Canva graphic from the screen: 7 with an honest summary, 3 when the summary overclaimed.
- **Why it matters:** AHE improves only as well as it reviews. Now that claim has numbers behind it.
- **Where:** `eval/` and `packages/backend/scripts/eval-self-review.ts`.

### Every package is tested on GitHub after each change

GitHub runs the tests on every push and pull request, with one check per package. A change that breaks the
dashboard shows a red "web-ui" check, and the other checks stay green.

- **Why it matters:** a broken change shows up in minutes, and the failed check names the package to fix.
- **Where:** `.github/workflows/ci.yml`. Six jobs, including a database job with its own Postgres.

### AHE starts from a fresh clone with one command

`pnpm quickstart` checks the Mac, installs everything, asks for the Meta API key, starts the database, and opens
the dashboard. It is safe to run again, and it says clearly what is missing, for example "Docker is not running".

- **Why it matters:** the setup drops from six steps in two terminals to one command.
- **Where:** `scripts/quickstart.sh`.

### AHE has a logo and a front page

The logo is three stacked layers on a blue tile, for the levels of work. The GitHub page opens with a banner,
real dashboard screenshots, and a short setup guide.

- **Why it matters:** a judge understands the project from the front page, before they run it.
- **Where:** `README.md`, `.github/assets/`, and the logo in `packages/web-ui`.

### The owner sees what each Job made

The Job panel on the Monitor board now opens with a screenshot of the work. One click shows it full screen.

- **Why it matters:** the owner compares the work itself with the agent's own review, side by side.
- **Where:** a new screenshot route in the backend API, and the Job panel in `packages/web-ui`.

### Each Task stays in its own lane on screen

The agent knows which work belongs to later Tasks, and it leaves that work alone. While it draws the first
design direction, it no longer fills in the empty sections that later Tasks will design.

- **Why it matters:** no work is done twice, and each Task is judged only on its own work.
- **Where:** the Task planner and the screen agent prompt.

### A run picks up cleanly after the backend stops

If the backend stops in the middle of a Task, the agent repairs that Task when it starts again. The Task closes
with a clear note, and the Job plans its next move from what is already on the screen.

- **Why it matters:** a run never gets stuck, and a half-done step never runs again blindly.
- **Where:** the orchestrator start-up and the Task service.

### Muse works faster on screen

Muse now groups the actions it can predict into one turn. It clicks a field, types, presses Return, and then
looks, all in one turn instead of four. Each step's log shows the pace, for example "2.8 actions per turn".

- **Why it matters:** fewer turns for the same work means faster Tasks and a lower model cost.
- **Where:** the Muse execution prompt, and a pace meter in the Task processor.

---

## 2 Nov 2026

### The agent uses the computer with Meta Muse

The agent can now click, type, scroll, and read the screen with Muse, not only with Claude. One setting,
`EXECUTION_PROVIDER=muse`, switches it.

- **Why it matters:** a judge with only a Meta key can run the whole agent, from the plan to the clicks.
- **Where:** `packages/execution/src/muse/`. Three live runs against Meta passed 3 of 3.

### WorkHub: every run in one place, with pause, resume, and run again

A Strategy is now a reusable goal, and each Workflow is one run of it. The WorkHub page lists every run, and
the owner can pause, resume, or run a Strategy again. A new run learns from the earlier runs.

- **Why it matters:** the owner controls long work, and a pause really stops the agent at the end of its step.
- **Where:** a new run route and the pause logic in the backend, and the WorkHub page in `packages/web-ui`.

### The owner creates and launches a Strategy from the dashboard

A "Create strategy" page takes a goal in plain words, the kind of work, and one Launch button. For example:
"Design a launch post in Canva, post it on Instagram, and email me the link".

- **Why it matters:** nobody needs the API or JSON to start the agent. A step bar shows each stage live.
- **Where:** the Create Strategy view in `packages/web-ui`.

### Each Job stays in its own lane

Every Job knows the other open Jobs of its round and leaves their work to them. A "design the logo" Job no
longer exports the files when a later "export the files" Job exists.

- **Why it matters:** no work is done twice, and each Job is judged fairly on its own part.
- **Where:** the Job planning and review prompts.

### The owner watches the agent work, live

The Monitor page draws the work as a live board in four lanes: the Strategy, its rounds, their Jobs, and every
Task. The running Task glows, and a click on any card opens its details and the agent's review.

- **Why it matters:** the owner and the judges follow the whole plan, act, and review loop on one screen.
  It also works from a phone, with a QR code at start-up.
- **Where:** the Monitor view in `packages/web-ui`, and the progress route in the backend.

---

## 1 Nov 2026

### The agent has a dashboard

A dark dashboard in the style of a macOS app, with frosted glass and one Meta blue accent. An icon bar switches
between Monitor, WorkHub, Create strategy, and Settings.

- **Why it matters:** the owner gets one place to watch and steer the agent, instead of logs.
- **Where:** the new `packages/web-ui` package (React, Emotion, Framer Motion, and Zustand).

### Designs aim for stylish, creative, and elegant work

When a brief names no style, the agent builds each design around one original idea, with strong colour, space,
and type. Before, its designs drifted to a plain look. A style that the owner names still wins.

- **Why it matters:** owners get work that stands out, and the reviewer no longer rewards plain work.
- **Where:** the design skill and the review prompts in `packages/backend/src/reasoning`.

### The planner sees the work it must improve

When the reviewer asks for changes to a design, the planner of the next Tasks sees the same screenshot. It
plans "close the empty band under the button", not general advice.

- **Why it matters:** the fix names what is wrong on the screen, so the agent changes the right thing.
- **Where:** Job planning in `packages/backend/src/reasoning`.

### The agent thinks with Meta Muse

Each thinking level of the agent can run on Muse: the strategist, the Job planner, and the step planner.
Muse Wonder handles the big decisions, and any level can switch to the faster Muse Spark.

- **Why it matters:** the agent's planning and its self-review run on Meta's own models.
- **Where:** `packages/backend/src/reasoning/providers`, plus a live check script, `muse-smoke.ts`.

### The agent stops polishing

A piece of work now gets one round of fixes inside a Job. After that, the next round takes the next idea.

- **Why it matters:** in an earlier run, one Job spent 44 minutes on font sizes. Big ideas now come between rounds.
- **Where:** the Job review prompt.

### The agent researches the brief on the web before it plans

The planner reads the links in the brief, looks up each name in it, and studies the best current work of that
kind. Given a website to announce, it reads the site first.

- **Why it matters:** the plan rests on facts about the owner's world, not on guesses.
- **Where:** the Strategy planner in `packages/backend/src/reasoning`.

---

## 31 Oct 2026

### The agent works with skills, and its reviewers see the design

Each Task gets a skill for its kind of work: design, social posts, or general. A design Task gets one long
session to make the whole piece, and the reviewers look at a screenshot of the result.

- **Why it matters:** the first live Canva run took 26 Tasks, and 18 of them only checked the design.
  Now a design takes one or two Tasks, and the review is based on what is on the screen.
- **Where:** `reasoning/task/skills/` and the execution layer.

### The owner answers the agent's questions, and the work continues

When the agent cannot go on alone, for example without a login, it holds the Task and asks the owner. One
answer unblocks it: approved, the Task runs again; rejected, the agent plans around the owner's note.

- **Why it matters:** one missing decision no longer fails a whole Job.
- **Where:** the reporting service and the escalation routes in the backend.

### The database sets itself up with one command

`pnpm compose:up` starts Postgres and Redis, creates every table, and keeps the tables in step with the code.
A change that would delete data is written down, but not applied until a person checks it.

- **Why it matters:** AHE runs on a fresh machine, and the code and the database never drift apart.
- **Where:** `docker-compose-dev.yml` and `packages/migrations`.

---

## 30 Oct 2026

### The agent works through each Task step by step on screen

For each Task, the agent plans the next step, the screen agent carries it out on the Mac, and the agent reads
the result and decides again. "Make a launch graphic in Canva" becomes "open canva.com, pick a template, set the
headline, report the design link".

- **Why it matters:** this closed the loop. A Strategy now runs from the plan down to real clicks.
- **Where:** Task reasoning in `packages/backend/src/reasoning/task`.

### Each round of work says which idea it tests

Each round gets a one-line idea and a reason, for example "Hook in the first 3 seconds, because round 1 lost
viewers before the hook".

- **Why it matters:** the owner sees what each round tried, and the planner sees which ideas worked.
- **Where:** the Strategy planner and the orchestrator.

### The owner sees what the agent did and how it went

One request returns the whole history of a run: every round, its Jobs, how each Job ended, and its review.

- **Why it matters:** this is the data behind the live dashboard.
- **Where:** the new `api` module in `packages/backend/src/api`.

### Long Jobs are no longer cut off

A Job used to fail at 20 Tasks, even when it was nearly done. Now 20 is a budget the agent plans around, and a
hard limit of 60 stops a runaway Job with a clear reason.

- **Why it matters:** real work, like a long design or a setup, can finish.
- **Where:** the Job planner and the Job processor.

### Ongoing, one-off, and multi-version work

The owner says what kind of goal it is, and the agent paces itself. Growing a community is ongoing, in rounds
that never end. A launch video is one-off, with up to 3 tries. Three logo ideas are multi-version.

- **Why it matters:** one agent handles a never-ending push and a single deliverable. Each round learns from
  the last, and ongoing work waits a day for the likes and replies before its review.
- **Where:** `packages/backend/src/orchestrator/`.

---

## 28 Oct 2026

### The agent judges work it has to see

Some work cannot be judged from a description, like a video or a design. The reviewer writes exact things to
check, for example "the titles stay readable", and the screen agent opens the work and rates each one.

- **Why it matters:** creative work stopped being a blind spot for the self-review.
- **Where:** `packages/backend/src/reasoning/evaluation/`.

### When the agent does not know what "good" looks like, it finds out

When no bar is set, the reviewer searches the web for strong examples of that kind of work, and reviews
against them. It learns from the best work, and it never copies it.

- **Why it matters:** the feedback becomes concrete, for example "a strong post opens with the problem".
- **Where:** the reviewer prompt and the shared model client.

---

## 27 Oct 2026

### The agent reviews its own work, and learns from it

When a round ends, the agent reviews each Job: what worked, and what to fix next time. It writes this as advice
to its own planner. If the real result is not known yet, like the likes on a post, it first sends a Job to the
Mac to read it.

- **Why it matters:** this is the base of the self-improvement loop. Before it plans, the agent finds its past
  reviews of similar work by meaning, so it stops repeating the same mistakes.
- **Where:** `packages/backend/src/reasoning/evaluation/`, with pgvector search and a local embedding model.

### Every finished Task records where the work was done

Each Task saves the place of its work: the link to the post, the saved file, or the steps to reach a screen in
an app. Tracking and login details are removed first.

- **Why it matters:** follow-ups go straight back to the right place, and every action can be traced.
- **Where:** `packages/agent-core`, `packages/execution`, and the Task processor.
