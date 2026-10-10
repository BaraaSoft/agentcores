/**
 * Model tiers allowed for the execution layer (screen parsing, clicking, typing).
 * Both run Anthropic's `computer_toolset_20260801`; the exact model id comes from `EXECUTION_MODEL_ID`.
 */
export const EXECUTION_MODELS = ['sonnet', 'haiku'] as const;

export type ExecutionModel = (typeof EXECUTION_MODELS)[number];
