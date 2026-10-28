import type { EvidenceRequest } from './evidence-request';
import type { ScoredJob } from './scored-job';

/** The outcome of judging one Job: either the mark itself, or a request to go and read the evidence. */
export type JobJudgement = ScoredJob | EvidenceRequest;
