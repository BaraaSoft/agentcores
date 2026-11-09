# AgentCores.AI evaluation

AgentCores.AI self-improves only as well as it reviews its own work. This benchmark tests that reviewer: the real
evaluator, with the app's own prompt, schema, model, and retry rule.

## The cases

Each case in [`cases/self-review.cases.json`](cases/self-review.cases.json) is one closed Job, as the evaluator
sees it in a real run. Every case runs 3 times.

- **Pairs.** The same Job done well and done weakly, for example a call booked on the wrong day. The strong
  work must score higher.
- **Screenshots.** A real Canva graphic that AgentCores.AI made in an earlier run. With its own brief, it must score 7
  or more. Under a different brief, with a summary that overclaims, it must score 4 or less.
- **Evidence.** Results that the record cannot show yet, such as likes on a post one minute old. The
  evaluator must ask to read the live result, not guess.

## Results

`muse-wonder-1.0`, 16 cases, 48 judgements, 3 Nov 2026.

| Measure | Result |
| --- | --- |
| Ranks the weak work above the strong work | 0 of 14 judged pairs |
| Mean score margin, strong minus weak | 5.38 of 10 |
| Judges visual work from its screenshot | 6 of 6 |
| Asks for live evidence instead of guessing | 5 of 6 |
| Asks for evidence when none is needed | 4 of 36 |
| Valid output, within 2 tries | 46 of 48 |
| Latency per judgement, median / p90 | 14.2 s / 25.3 s |

Each verdict is in [`results/latest.md`](results/latest.md), and each raw judgement is in [`results/latest.json`](results/latest.json).

## What we learnt

- **It trusts the screen, not the summary.** It scored the real graphic 7. It scored the same image 3 when
  the summary claimed that it announced something else.
- **It checks the facts.** An early case used made-up products, and it scored that "strong" sheet 1 of 10.
  We fixed the case, not the evaluator.
- **An unsure model sometimes writes a score of 0.** The schema rejects it on purpose, and the queue tries
  again.

The cases are few and written by hand. They show behaviour, not a large statistical sample.

## Run it

Put `META_API_KEY` in the root `.env`, then run `pnpm eval` from the root. It takes about 4 minutes.
