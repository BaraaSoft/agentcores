/**
 * Model tiers allowed for the reasoning layer (planning, deciding, evaluating).
 * The value list and its type are kept together so DTO validation and typing stay in sync.
 */
export const REASONING_MODELS = ['opus', 'sonnet'] as const;

export type ReasoningModel = (typeof REASONING_MODELS)[number];
