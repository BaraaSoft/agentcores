/**
 * Benchmark of AHE's self-review: runs the real evaluator on the cases in `eval/cases` and measures how
 * often it ranks good work above weak work, trusts a screenshot over an overclaiming summary (when a case
 * has one), and asks for live evidence instead of guessing. Run with `pnpm eval`; needs META_API_KEY in the root `.env`.
 * Writes `eval/results/latest.json` and `eval/results/latest.md`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JobOutcomeStatus, Screenshot, TaskStatus } from '@ahe/agent-core';
import { MAX_JUDGING_ATTEMPTS } from '../src/governance/processors/job-evaluation/job-evaluation.constants';
import { MAX_JOB_SCORE, MIN_JOB_SCORE } from '../src/reasoning/evaluation/evaluation-reasoning.constants';
import { EvaluationReasoningService } from '../src/reasoning/evaluation/evaluation-reasoning.service';
import type { JobJudgement } from '../src/reasoning/evaluation/types/job-judgement';
import type { JudgeJobInput } from '../src/reasoning/evaluation/types/judge-job-input';
import { MuseReasoningProvider } from '../src/reasoning/providers/muse-reasoning.provider';
import { ReasoningModelClient } from '../src/reasoning/reasoning-model.client';

const ROOT = resolve(__dirname, '../../..');
const EVAL_DIR = resolve(ROOT, 'eval');
const CASES_FILE = resolve(EVAL_DIR, 'cases/self-review.cases.json');
const RESULTS_DIR = resolve(EVAL_DIR, 'results');
const DEFAULT_MODEL = 'muse-wonder-1.0';
const CONCURRENCY = 4;
/** Each case runs this many times, so one lucky or unlucky answer does not decide a measure. */
const RUNS = 3;

interface CaseTask {
  readonly action: string;
  readonly status: TaskStatus;
  readonly summary: string;
  readonly locationPath: string | null;
}

interface CaseJob {
  readonly outcomeStatus: JobOutcomeStatus;
  readonly outcomeSummary: string;
  readonly tasks: readonly CaseTask[];
  readonly screenshot?: string;
}

interface CaseHeader {
  readonly id: string;
  readonly strategyObjective: string;
  readonly jobName: string;
  readonly objective: string;
}

interface Cases {
  readonly pairs: readonly (CaseHeader & { readonly strong: CaseJob; readonly weak: CaseJob })[];
  /** Visual Jobs judged on their screenshot: strong work must reach `minScore`, overclaimed work stay at `maxScore`. */
  readonly screenshotChecks: readonly (CaseHeader & { readonly job: CaseJob; readonly minScore?: number; readonly maxScore?: number })[];
  readonly evidenceChecks: readonly (CaseHeader & { readonly job: CaseJob })[];
}

interface Judged {
  readonly judgement: JobJudgement | null;
  readonly error: string | null;
  /** Calls made, up to `MAX_JUDGING_ATTEMPTS`, as the evaluation queue retries a judgement that throws. */
  readonly attempts: number;
  /** Time of the call that settled it, or of the last call when every attempt failed. */
  readonly latencyMs: number;
}

interface PairRow {
  readonly id: string;
  readonly run: number;
  readonly strong: string;
  readonly weak: string;
  readonly strongScore: number | null;
  readonly weakScore: number | null;
  readonly ranked: boolean;
  readonly deferred: boolean;
}

interface CheckRow {
  readonly id: string;
  readonly run: number;
  readonly expected: string;
  readonly verdict: string;
  readonly passed: boolean;
}

function groupById<T extends { readonly id: string }>(rows: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(row.id, [...(groups.get(row.id) ?? []), row]);
  return [...groups.values()];
}

function toInput(header: CaseHeader, job: CaseJob): JudgeJobInput {
  const screenshot: Screenshot | null = job.screenshot
    ? { mediaType: 'image/png', base64: readFileSync(resolve(EVAL_DIR, job.screenshot)).toString('base64') }
    : null;
  return {
    jobName: header.jobName,
    objective: header.objective,
    strategyObjective: header.strategyObjective,
    outcomeStatus: job.outcomeStatus,
    outcomeSummary: job.outcomeSummary,
    tasks: job.tasks.map((task) => ({
      action: task.action,
      status: task.status,
      result: { summary: task.summary, metricReadings: {}, completedAt: new Date() },
      failureReason: null,
      locationPath: task.locationPath,
      locationDetails: null,
    })),
    evidence: null,
    screenshot,
  };
}

async function judge(evaluator: EvaluationReasoningService, input: JudgeJobInput): Promise<Judged> {
  let error = '';
  let latencyMs = 0;
  for (let attempt = 1; attempt <= MAX_JUDGING_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const judgement = await evaluator.judgeJob(input);
      return { judgement, error: null, attempts: attempt, latencyMs: Date.now() - started };
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      latencyMs = Date.now() - started;
    }
  }
  return { judgement: null, error, attempts: MAX_JUDGING_ATTEMPTS, latencyMs };
}

/** Runs the calls a few at a time, so the benchmark is quick without flooding the API. */
async function runPool<T>(jobs: readonly (() => Promise<T>)[], size: number): Promise<T[]> {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await jobs[index]();
      process.stdout.write('.');
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, worker));
  process.stdout.write('\n');
  return results;
}

const scoreOf = (judged: Judged): number | null => (judged.judgement?.verdict === 'scored' ? judged.judgement.score : null);
const verdictOf = (judged: Judged): string => judged.error ? 'error' : judged.judgement!.verdict === 'scored' ? `scored ${scoreOf(judged)}` : 'asked for evidence';
const percent = (part: number, whole: number): string => (whole === 0 ? 'n/a' : `${Math.round((part / whole) * 100)}%`);

function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

async function main(): Promise<void> {
  const envFile = resolve(ROOT, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const apiKey = process.env.META_API_KEY;
  if (!apiKey) throw new Error('META_API_KEY is not set in the root .env');
  const modelId = process.env.REASONING_STRATEGY_MODEL_ID || DEFAULT_MODEL;
  const client = new ReasoningModelClient(MuseReasoningProvider.create(apiKey), { providerName: 'muse', modelId, effort: 'high' });
  const evaluator = new EvaluationReasoningService(client);

  const cases = JSON.parse(readFileSync(CASES_FILE, 'utf8')) as Cases;
  const oneRun: JudgeJobInput[] = [
    ...cases.pairs.flatMap((pair) => [toInput(pair, pair.strong), toInput(pair, pair.weak)]),
    ...cases.screenshotChecks.map((check) => toInput(check, check.job)),
    ...cases.evidenceChecks.map((check) => toInput(check, check.job)),
  ];
  const inputs = Array.from({ length: RUNS }, () => oneRun).flat();
  console.log(`Judging ${oneRun.length} Jobs ${RUNS} times with ${modelId}, ${CONCURRENCY} at a time`);
  const judged = await runPool(inputs.map((input) => () => judge(evaluator, input)), CONCURRENCY);

  let cursor = 0;
  const pairRows: PairRow[] = [];
  const screenshotRows: CheckRow[] = [];
  const evidenceRows: CheckRow[] = [];
  const pairJudgements: Judged[] = [];
  for (let run = 1; run <= RUNS; run++) {
    for (const pair of cases.pairs) {
      const strong = judged[cursor++];
      const weak = judged[cursor++];
      pairJudgements.push(strong, weak);
      const strongScore = scoreOf(strong);
      const weakScore = scoreOf(weak);
      const comparable = strongScore !== null && weakScore !== null;
      // Asking to see live work before marking it is the designed path, not a miss: the score comes later.
      const deferred = !comparable && [strong, weak].some((result) => result.judgement?.verdict === 'needs_evidence');
      pairRows.push({ id: pair.id, run, strong: verdictOf(strong), weak: verdictOf(weak), strongScore, weakScore, ranked: comparable && strongScore > weakScore, deferred });
    }
    for (const check of cases.screenshotChecks) {
      const result = judged[cursor++];
      const score = scoreOf(result);
      const min = check.minScore ?? MIN_JOB_SCORE;
      const max = check.maxScore ?? MAX_JOB_SCORE;
      const expected = check.minScore !== undefined ? `a score of ${min} or more` : `a score of ${max} or less`;
      screenshotRows.push({ id: check.id, run, verdict: verdictOf(result), expected, passed: score !== null && score >= min && score <= max });
    }
    for (const check of cases.evidenceChecks) {
      const result = judged[cursor++];
      evidenceRows.push({ id: check.id, run, verdict: verdictOf(result), expected: 'asks for evidence', passed: result.judgement?.verdict === 'needs_evidence' });
    }
  }

  const falseEvidence = pairJudgements.filter((result) => result.judgement?.verdict === 'needs_evidence').length;
  const errors = judged.filter((result) => result.error !== null).length;
  const latencies = judged.filter((result) => result.error === null).map((result) => result.latencyMs);
  const margins = pairRows.filter((row) => row.strongScore !== null && row.weakScore !== null).map((row) => row.strongScore! - row.weakScore!);
  const ranked = pairRows.filter((row) => row.ranked).length;
  const deferred = pairRows.filter((row) => row.deferred).length;
  const judgedPairs = pairRows.length - deferred;
  const firstTryValid = judged.filter((result) => result.error === null && result.attempts === 1).length;

  const summary = {
    model: modelId,
    ranAt: new Date().toISOString(),
    judgements: judged.length,
    rankingAccuracy: { passed: ranked, total: judgedPairs },
    pairsDeferredForEvidence: { count: deferred, total: pairRows.length },
    meanScoreMargin: margins.length === 0 ? null : Number((margins.reduce((a, b) => a + b, 0) / margins.length).toFixed(2)),
    screenshotOverSummary: { passed: screenshotRows.filter((row) => row.passed).length, total: screenshotRows.length },
    evidenceRecall: { passed: evidenceRows.filter((row) => row.passed).length, total: evidenceRows.length },
    falseEvidenceRequests: { count: falseEvidence, total: pairJudgements.length },
    validOutput: { passed: judged.length - errors, total: judged.length },
    validOutputFirstTry: { passed: firstTryValid, total: judged.length },
    latencyMs: latencies.length === 0 ? null : { median: quantile(latencies, 0.5), p90: quantile(latencies, 0.9) },
  };

  const lines = [
    `# Self-review benchmark: latest results`,
    ``,
    `Model: \`${modelId}\`. Run: ${summary.ranAt.slice(0, 16).replace('T', ' ')} UTC. Each case ran ${RUNS} times, ${judged.length} judgements in all.`,
    ``,
    `| Measure | Result |`,
    `| --- | --- |`,
    `| Ranks the strong work above the weak work | ${ranked} of ${judgedPairs} judged pairs (${percent(ranked, judgedPairs)}) |`,
    `| Pairs deferred until live evidence is read | ${deferred} of ${pairRows.length} |`,
    `| Mean score margin, strong minus weak | ${summary.meanScoreMargin ?? 'n/a'} points |`,
    ...(screenshotRows.length === 0
      ? []
      : [`| Judges visual work from its screenshot | ${summary.screenshotOverSummary.passed} of ${summary.screenshotOverSummary.total} |`]),
    `| Asks for live evidence instead of guessing | ${summary.evidenceRecall.passed} of ${summary.evidenceRecall.total} |`,
    `| Asks for evidence when none is needed | ${falseEvidence} of ${pairJudgements.length} |`,
    `| Returns valid structured output, first try | ${firstTryValid} of ${judged.length} |`,
    `| Returns valid structured output, within ${MAX_JUDGING_ATTEMPTS} tries (as the queue retries) | ${summary.validOutput.passed} of ${summary.validOutput.total} |`,
    `| Latency per judgement, median / p90 | ${summary.latencyMs ? `${(summary.latencyMs.median / 1000).toFixed(1)} s / ${(summary.latencyMs.p90 / 1000).toFixed(1)} s` : 'n/a'} |`,
    ``,
    `## Pairs`,
    ``,
    `One verdict per run, in run order.`,
    ``,
    `| Case | Strong work | Weak work | Ranked right |`,
    `| --- | --- | --- | --- |`,
    ...groupById(pairRows).map(
      (rows) =>
        `| ${rows[0].id} | ${rows.map((row) => row.strong).join('; ')} | ${rows.map((row) => row.weak).join('; ')} | ` +
        `${rows.map((row) => (row.deferred ? 'deferred' : row.ranked ? 'yes' : 'no')).join('; ')} |`,
    ),
    ``,
    screenshotRows.length === 0 ? `## Evidence checks` : `## Screenshot and evidence checks`,
    ``,
    `| Case | Expected | Verdicts | Passed |`,
    `| --- | --- | --- | --- |`,
    ...groupById([...screenshotRows, ...evidenceRows]).map(
      (rows) =>
        `| ${rows[0].id} | ${rows[0].expected} | ${rows.map((row) => row.verdict).join('; ')} | ` +
        `${rows.filter((row) => row.passed).length} of ${rows.length} |`,
    ),
    ``,
  ];

  mkdirSync(RESULTS_DIR, { recursive: true });
  const details = { summary, pairs: pairRows, screenshotChecks: screenshotRows, evidenceChecks: evidenceRows, judgements: judged };
  writeFileSync(resolve(RESULTS_DIR, 'latest.json'), `${JSON.stringify(details, null, 2)}\n`);
  writeFileSync(resolve(RESULTS_DIR, 'latest.md'), lines.join('\n'));
  console.log(lines.join('\n'));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
