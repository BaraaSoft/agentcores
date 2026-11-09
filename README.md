



![AgentCores.AI: an AI co-worker that runs long work on a real computer, and gets better every round](.github/assets/banner.png)

### Give it a goal. It plans, acts on a real computer, and self-improves with every round.



![Runs on macOS](https://img.shields.io/badge/runs%20on-macOS-111111?style=flat-square&logo=apple&logoColor=white)  ![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)  ![Node.js 22](https://img.shields.io/badge/Node.js-22-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)  ![pnpm 10](https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm&logoColor=white)  ![License AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-8A8F98?style=flat-square)



**[Website](https://agentcores.ai)** · **[Demo](#demo)** · **[Quick start](#quick-start)** · **[How it works](#how-it-works)** · **[The dashboard](#the-dashboard)** · **[Safety](#safety)** · **[Project structure](#Project-structure)**

## What AgentCores.AI is

It is an **AI co-worker**. It takes ownership of a goal, and it carries the work for days or weeks.

AgentCores.AI has its own internal governance and orchestration system. The system breaks a goal into levels of work,
so many AI agents can work as one co-worker and share what they learn. AgentCores.AI does each piece on a real Mac with
the mouse and the keyboard, like a person. It self-improves. It learns from its own work: it keeps what worked,
and it fixes what did not. It recovers from failures, gets past routine obstacles, and builds a knowledge base
as it goes.

You do not prompt it step by step. You brief it once, like a colleague. Then you watch it work.

## Demo

One run, from start to end. AgentCores.AI plans a book launch, designs the graphic in Canva, marks its own work, and posts
it on X. The dashboard is on the left, and the Mac screen is on the right. Both are sped up.

https://github.com/user-attachments/assets/e6935fdd-6f6c-48c8-928a-4fbc207588c5

## A co-worker, not an assistant

An assistant waits for your next prompt. A co-worker owns a piece of the work, and its judgement grows over time.

| | A typical agent | AgentCores.AI |
| --- | --- | --- |
| Scope | One prompt, one loop | One goal that runs for days or weeks |
| Memory of the work | The chat window | A knowledge base of every round, Job, Task, and lesson |
| Quality | It stops when the steps end | It learns from its own work and tries a better idea |
| Evidence | It guesses | It opens the real post, file, or design first |
| When stuck | It fails or loops | It recovers, waits, or asks you one clear question |
| Control | Kill the process | Pause, resume, or run again from a dashboard |

## What it can do

**Governance, not just execution.** AgentCores.AI splits a goal into four levels: Strategy, Unit of Work, Job, and Task.
Each level plans on its own and reads only a short summary of the level below. This keeps long autonomy cheap
and clear, even after hundreds of steps. Many agents work as one co-worker and share what they learn.

**Self-improvement is the core.** After every round, an evaluator reviews each Job against real evidence: the
actual output and the actual numbers, opened on the real screen. When the evidence is missing, AgentCores.AI sends a real
Job to get it, for example to open the analytics dashboard and read this week's sign-ups. The lessons feed the
next round: keep what worked, fix what did not. A new run of the same goal reads the last three runs, and AgentCores.AI
finds similar past work by meaning. In [our benchmark](eval/), it never ranked weak work above strong work.

**Any app on the Mac.** AgentCores.AI operates macOS with the mouse, the keyboard, and screenshots, like a person. It works  
in Canva, spreadsheets, the browser, or anything else on the screen. It recovers on its own from popups, broken pages,  
rate limits, and crashes.

**Safety by design.** Hard walls block system settings, purchases, and account changes. AgentCores.AI reports a CAPTCHA
and never solves it. It types a login only on that login's own site.

## The dashboard

The dashboard is where you brief your co-worker and watch it work. It is dark, glassy, and live.

The screenshots below use sample data. The Canva graphic inside the Job panel is real: AgentCores.AI designed it in an earlier run.

### Watch the work, live

![The Monitor board with the Strategy, Units of Work, Jobs, and Tasks in four lanes](.github/assets/monitor-board.png)

The **Monitor** page draws the whole run as a live board in four lanes: Strategy, Units of Work, Jobs, and
Tasks. The green card runs now, and a light flows along its line. The bar on top sums up the run: the rounds,
the Jobs at work, the Tasks done, and the best result. The board updates every 2 seconds.

AgentCores.AI uses the Mac's own screen, so watch from your phone. `pnpm dev:start` prints the Wi-Fi address and a QR code.

### See what it made, and what it learned

![The Job panel with the screenshot of the work, the objective, the outcome, and the agent's own review](.github/assets/monitor-judged.png)

Click any card to open its details. A Job shows the final screen of its work, the objective, the outcome, and  
the agent's own review: what worked, and what to fix. Click the screenshot to see it full screen.

### Brief it like a colleague

![The Create strategy page with a goal for a logo](.github/assets/create-strategy.png)

1. Open **Create strategy**.
2. Write a short name and the outcome you want, one step per line.
3. Choose how the work repeats: one-off, multi-version, or continuous.
4. Click **Launch**. The side panel shows each launch step, and the dashboard opens Monitor.

### Every run in one place

![WorkHub with every run, its state, and the Run again panel](.github/assets/workhub.png)

A Strategy is a reusable goal. Each Workflow is one run of it: running, paused, or done. **WorkHub** lists every
run. Pause one, resume it, or open it in Monitor. To start a goal again from round 1, pick it in **Run again**.
The fresh run still learns from the earlier runs.  
One Mac runs one Workflow at a time, so AgentCores.AI pauses the current run first.

## How it works

### Four levels of work

```mermaid
flowchart TD
    Goal(["Your goal, in plain words"]) --> S
    S["Strategy<br/>the goal, and how the work repeats"] --> U["Unit of Work<br/>one round, attempt, or version"]
    U --> J["Job<br/>one objective, planned and reviewed"]
    J --> T["Task<br/>one action on the screen"]
    T --> Mac[["A real Mac<br/>screen, mouse, keyboard"]]
    Mac -. "result and location" .-> J
    J -. "outcome" .-> E{{"Evaluator<br/>what worked, what to fix"}}
    E -. "lessons" .-> S
```

Each level reads only a short summary of the level below it. The Strategy planner never sees a Task. The Task
planner never sees a screenshot. Only the final screen of a visual Task goes up, to the Job reviewer and the
evaluator. This keeps long autonomy cheap, and the thread stays clear after hundreds of steps.

### The loop that makes it better

1. **Plan.** The Strategy planner researches the brief and writes the Jobs of the next round. Each round names
   the idea it tests, and why.
2. **Act.** For each Task, the Task planner writes one step. The hands-on agent does the work on screen and
   reports back. The planner reads the result and writes the next step, until the Task is done.
3. **Review.** The Job reviewer checks every finished Task. It continues, revises the plan, or closes the Job.
4. **Reflect.** When a round ends, the evaluator reviews each Job. It writes what worked and what to fix, as
   advice for its own planner.
5. **Self-improve.** The next round keeps what worked and fixes what did not. When the stop rule says the goal
   is met, the run is done.

The orchestrator moves every run forward once a minute. A pass decides when a round opens, when it is reviewed,
and which Jobs may start.

### Thinking and doing are separate

The **reasoning layer** plans and reviews. It never touches the screen. The **execution layer** sees the screen,  
and clicks and types. It gets one plain instruction, the scope of its Task, and nothing else.  
Each level picks its own model, so a fast model can plan every step and a strong model can review.

## Quick start

### What you need

- **A Mac with macOS.** AgentCores.AI controls this Mac's own screen. Use a Mac that the agent can have while it works.
- **Docker Desktop**
- **Node.js 22** and **pnpm 10**. Run `corepack enable` to get pnpm.
- **Xcode Command Line Tools**, for the native mouse and keyboard module. Run `xcode-select --install`.
- **A Meta API key** for Muse. An Anthropic key also works, if you want Claude.

### Run it

1. Clone the repository.
   ```bash
    git clone https://github.com/BaraaSoft/agentcores.git
    cd agentcores
   ```
2. Install the packages, then run the quick start. Paste your Meta API key when it asks.
   ```bash
    pnpm install
    pnpm quickstart
   ```

    It checks your Mac, Node.js, pnpm, and Docker, and installs the packages. It writes `.env` with Muse on every
    layer, starts Postgres and Redis in Docker, and applies the migrations. Then it checks the screen
    permissions and launches AgentCores.AI.
3. Open [http://localhost:5173](http://localhost:5173), and create your first strategy.

The first time, macOS asks you to allow your terminal app in **Accessibility** and **Screen Recording**. Allow
both, restart the terminal, and run `pnpm quickstart` again. Each run skips the work that is already done.

<details>
<summary><b>Run each step by hand</b></summary>

<br/>


1. Install the packages, and create your `.env` file from the example.
   ```bash
    pnpm install
    cp .env.example .env
   ```
2. Open `.env`, and add your Meta key. Create the key in the

   [Meta Model API dashboard](https://dev.meta.ai/docs/authentication). Then set every layer to Muse.
   > **Tip:** For the most reliable screen control, keep Muse on the reasoning layers, and run execution on
   > Claude. Set `EXECUTION_PROVIDER=anthropic`, and add your `ANTHROPIC_API_KEY`.
3. Start the database and the queue. Leave this terminal open.
   ```bash
    pnpm compose:up
   ```

    This starts Postgres with pgvector on port 5433 and Redis on port 6380. Then it applies every migration.
4. In a new terminal, give the agent the screen.
   ```bash
    pnpm --filter @agentcores/execution check:desktop
   ```

    The check saves one screenshot, and it sends no mouse or keyboard input.
5. Launch AgentCores.AI.
   ```bash
    pnpm dev:start
   ```

    This starts the backend on port 3088 and the dashboard on port 5173. The first start also downloads a small
    embedding model, one time.

</details>


> [!WARNING]
> AgentCores.AI uses the real mouse and keyboard. Do not use the Mac while a Task runs. Pause the run from the dashboard
> first, and the agent stops after its current step.

### Choose the models

Each layer reads its own setting in `.env`. Set a provider to `muse` or `anthropic`, and mix them if you like.
The Anthropic provider uses `ANTHROPIC_API_KEY`.

| Setting | What it runs | Suggested model |
| --- | --- | --- |
| `REASONING_STRATEGY_PROVIDER` | Plans each round, and reviews the work | `claude-opus-5-5` |
| `REASONING_JOB_PROVIDER` | Plans and reviews the Tasks of each Job | `claude-opus-5-5` |
| `REASONING_TASK_PROVIDER` | Plans every step, the hot path | `claude-opus-5-5` |
| `EXECUTION_PROVIDER` | Sees the screen, clicks, and types | `claude-sonnet-5-5` |

Each provider has a matching `_MODEL_ID` setting. Leave it empty to use the suggested model. On Muse, every
layer defaults to `muse-wonder-1.0`.

### Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev:start` | Starts the backend and the dashboard together |
| `pnpm compose:down` | Stops Postgres and Redis |
| `pnpm dev:reset` | Clears every run, queue, and screenshot, and keeps your Strategies. Stop the backend first |
| `pnpm test` | Runs the unit tests of every package |
| `pnpm test:integration` | Runs the database tests against a real Postgres |
| `pnpm test:smoke` | Calls the live Meta Model API with both Muse models. Needs `META_API_KEY` |
| `pnpm typecheck` | Type-checks every package |

The integration tests need an `ahe_test` database. Create it once:

```bash
docker compose -f compose.yaml exec postgres createdb -U ahe ahe_test
```

The backend also serves two admin tools: the API docs at [localhost:3088/admin/docs](http://localhost:3088/admin/docs)
and the queues at [localhost:3088/admin/queues](http://localhost:3088/admin/queues). The login comes from
`ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.

## Troubleshooting

<details>
<summary><b>Troubleshooting guide</b>: fixes for common setup errors</summary>

<br/>

#### "AgentCores.AI needs Node.js 22 or newer"

The scripts run with the Node that pnpm uses, and that can differ from the `node` in your terminal. Compare
the two:

```bash
node -v             # the Node in your terminal
pnpm exec node -v   # the Node your scripts get
```

If either one is below 22, switch to Node 22 with the tool you already use, then get pnpm again on top of it:

| You use | Switch to Node 22 |
| --- | --- |
| The installer from [nodejs.org](https://nodejs.org) | Install the 22 LTS release |
| Homebrew | `brew install node@22 && brew link --overwrite --force node@22` |
| nvm | `nvm install 22 && nvm alias default 22` |
| fnm | `fnm install 22 && fnm default 22` |
| Volta | `volta install node@22` |

```bash
corepack enable                          # gives you the pnpm version in package.json (10.4.1)
corepack prepare pnpm@10.4.1 --activate
```

With Volta, run `volta install pnpm@10.4.1` instead. Volta keeps each tool on the Node it was installed
with, so pnpm stays on the old Node until you reinstall it.

Open a new terminal, and check that `pnpm exec node -v` shows 22 and `pnpm -v` shows 10.4.1. If it still
shows an old version, run `which -a pnpm`. A pnpm installed earlier with `npm install -g pnpm` or Homebrew
may come first on your `PATH`. Remove it with `npm uninstall -g pnpm` or `brew uninstall pnpm`.

#### "Screen Recording: MISSING" or "Accessibility (input): MISSING"

macOS gives these permissions to the app that runs the terminal, not to the terminal tab. In the Cursor or
VS Code terminal, that app is Cursor or VS Code. Otherwise it is Terminal or iTerm.

1. Open **System Settings › Privacy & Security**.
2. Turn the app on in **Accessibility** and in **Screen & System Audio Recording**. If it is not in the list,
   add it with **+**.
3. Quit the app with Cmd+Q, and open it again. A new tab is not enough.
4. Run `pnpm quickstart` again.

#### "Cannot find module '../bin/napi-v6/darwin/x64/onnxruntime_binding.node'"

This happens on Intel Macs. `onnxruntime-node` 1.24 and later ship no Intel Mac binary, so the local
embedding model cannot load. The root `package.json` pins the last release that has one:

```json
"pnpm": { "overrides": { "onnxruntime-node": "1.23.2" } }
```

If you still see the error, reinstall so the pin takes effect: `pnpm install`. Then check that
`node_modules/.pnpm/onnxruntime-node@1.23.2/node_modules/onnxruntime-node/bin/napi-v6/darwin/x64` exists.

</details>

## Safety

The safety rules live in the structure, not in a filter at the end.

- **The screen is untrusted.** Only the instruction counts. AgentCores.AI never follows text it finds on a web page, in a
message, or in a notification.
- **Hard walls.** It never opens Terminal, changes system settings, makes purchases, accepts terms, creates
accounts, or changes passwords.
- **Gates it never passes.** A CAPTCHA, a verification code, or an account warning stops the Task. AgentCores.AI reports
it, and a planner decides what happens next.
- **Owner escalation.** Some decisions belong to you, such as a login it does not have. AgentCores.AI parks the Task and  
asks you. (coming soon)
- **Guardrails on effort.** Three failed Tasks in a row close a Job. A Job plans around a budget of 20 Tasks,
and it stops at a hard limit of 60.
- **Credentials stay where they belong.** AgentCores.AI types a login only on its own site, and never repeats it in a
report. It also removes tokens and tracking codes from every saved link.
- **One machine, one run.** A new run on the Mac pauses the current one first, so two runs never fight for
the mouse.

## Project structure

```text
packages/
├── agent-core/    shared domain types and contracts
├── backend/       runs on your Mac (localhost:3088): the API, the reasoning layer, the queues, and the orchestrator
├── execution/     the hands-on agent: the macOS driver, and the Muse and Claude providers
├── migrations/    migrations, applied by Docker on start
└── web-ui/        the ui dashboard (localhost:5173)
```

<details>
<summary><b>Engineering notes</b>: the rules we hold to</summary>

<br/>


- **The database is the source of truth.** Queues only carry work. A message that arrives late, twice, or out of
order changes nothing.
- **Every state change checks the state it expects.** A Task delivered twice runs once.
- **Reasoning is stateless.** Each reasoner reads its inputs from the database, decides, and returns JSON.
- **Tests at every level.** 479 automated tests: 277 backend unit tests, 69 database integration tests, and
133 execution tests. An end-to-end suite also runs the real desktop with a real model.
- **A benchmark for the self-review.** [`eval/`](eval/) runs the real evaluator on pairs of strong and weak
work, on screenshots of real visual work, and on Jobs that need live evidence. It reports ranking accuracy, evidence requests, valid output,
and latency.

</details>


## Roadmap

- Connect with HumanExperiences.IO so HumanExperiences users can operate their AgentCores.AI from there.
- Run several Macs at once, one Workflow on each.
- Add more skills, for video editing and CAD engineering design.
- Let the owner operate AgentCores.AI from Slack workspaces and WhatsApp.

## License

AgentCores.AI is open source under the [GNU Affero General Public License v3.0](LICENSE).

Follow [@baraaabuzaid](https://x.com/baraaabuzaid) on X for updates on AgentCores.AI.
