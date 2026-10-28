import { Injectable } from '@nestjs/common';
import { ReasoningModelClient } from '../reasoning-model.client';
import { JUDGE_JOB_MAX_SEARCHES, JUDGE_JOB_MAX_TOKENS, MAX_JOB_SCORE, MIN_JOB_SCORE } from './evaluation-reasoning.constants';
import { EVALUATION_REASONING_PROMPTS } from './evaluation-reasoning.prompts';
import { JOB_JUDGEMENT_OUTPUT_SCHEMA } from './schemas/job-judgement-output.schema';
import type { JobJudgement } from './types/job-judgement';
import type { JudgeJobInput } from './types/judge-job-input';

/**
 * Evaluation reasoning: marks one Job out of 10 against its objective and says, briefly and
 * precisely, what was good and what was not. It decides for itself what standard the work should be
 * held to, and it does not guess when it is short of what it needs: it can search the web mid-judgement
 * to learn how work of this kind is done well, and for anything behind the owner's own login it asks for
 * a Job to go and read it. It reads Task outcomes only — never individual steps.
 */
@Injectable()
export class EvaluationReasoningService {
  constructor(private readonly model: ReasoningModelClient) {}

  /**
   * Judges one Job as it stands today: either a mark with its feedback, or a request for the
   * evidence that would settle it.
   */
  async judgeJob(input: JudgeJobInput): Promise<JobJudgement> {
    const output = await this.model.completeStructured({
      systemPrompt: EVALUATION_REASONING_PROMPTS.judgeJob.system,
      userPrompt: EVALUATION_REASONING_PROMPTS.judgeJob.user(input),
      maxTokens: JUDGE_JOB_MAX_TOKENS,
      schema: JOB_JUDGEMENT_OUTPUT_SCHEMA,
      webSearch: { maxSearches: JUDGE_JOB_MAX_SEARCHES },
    });

    if (output.verdict === 'needs_evidence') {
      if (output.evidenceObjective === null || output.evidenceObjective === '') {
        throw new Error('Evaluation reasoning asked for evidence without saying what to find out');
      }
      return {
        verdict: 'needs_evidence',
        evidenceJobName: output.evidenceJobName || `Measure: ${input.jobName}`,
        evidenceObjective: output.evidenceObjective,
        evidenceCriteria: output.evidenceCriteria ?? [],
        rubric: output.rubric,
      };
    }

    if (output.score === null) throw new Error('Evaluation reasoning marked the Job without a score');
    return {
      verdict: 'scored',
      score: Math.min(MAX_JOB_SCORE, Math.max(MIN_JOB_SCORE, output.score)),
      // Falling back to the raw objective keeps the mark rather than losing it; the summary is only
      // what the search matches on.
      objectiveSummary: output.objectiveSummary || input.objective,
      whatGood: output.whatGood ?? '',
      whatBad: output.whatBad ?? '',
      rubric: output.rubric,
    };
  }
}
