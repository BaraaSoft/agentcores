# Self-review benchmark: latest results

Model: `muse-wonder-1.0`. Run: 2026-11-03 09:06 UTC. Each case ran 3 times, 48 judgements in all.

| Measure | Result |
| --- | --- |
| Ranks the strong work above the weak work | 13 of 14 judged pairs (93%) |
| Pairs deferred until live evidence is read | 4 of 18 |
| Mean score margin, strong minus weak | 5.38 points |
| Judges visual work from its screenshot | 6 of 6 |
| Asks for live evidence instead of guessing | 5 of 6 |
| Asks for evidence when none is needed | 4 of 36 |
| Returns valid structured output, first try | 42 of 48 |
| Returns valid structured output, within 2 tries (as the queue retries) | 46 of 48 |
| Latency per judgement, median / p90 | 14.2 s / 25.3 s |

## Pairs

One verdict per run, in run order.

| Case | Strong work | Weak work | Ranked right |
| --- | --- | --- | --- |
| x-launch-post | asked for evidence; asked for evidence; error | scored 2; scored 2; scored 2 | deferred; deferred; no |
| competitor-pricing-sheet | scored 5; scored 8; scored 6 | scored 3; scored 2; scored 3 | yes; yes; yes |
| refund-email-reply | scored 8; scored 8; scored 8 | scored 2; asked for evidence; asked for evidence | yes; deferred; deferred |
| calendar-invite | scored 8; scored 8; scored 8 | scored 2; scored 2; scored 2 | yes; yes; yes |
| meeting-notes | scored 8; scored 7; scored 8 | scored 2; scored 2; scored 2 | yes; yes; yes |
| docs-bug-report | scored 8; scored 8; scored 8 | scored 2; scored 2; scored 2 | yes; yes; yes |

## Screenshot and evidence checks

| Case | Expected | Verdicts | Passed |
| --- | --- | --- | --- |
| canva-book-launch-strong | a score of 7 or more | scored 7; scored 7; scored 7 | 3 of 3 |
| canva-beta-post-overclaimed | a score of 4 or less | scored 3; scored 3; scored 3 | 3 of 3 |
| post-likes-too-early | asks for evidence | error; asked for evidence; asked for evidence | 2 of 3 |
| newsletter-open-rate | asks for evidence | asked for evidence; asked for evidence; asked for evidence | 3 of 3 |
