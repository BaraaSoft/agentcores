import { registerAs } from '@nestjs/config';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is not set`);
  return value;
}

/**
 * Reasoning model settings. Strategy and Unit use `REASONING_MODEL_ID`; Job and Task can each run
 * their own model and fall back to it. Task is the hot path (every step), so it thinks with less
 * effort and is the first to move to another model.
 */
export const reasoningConfig = registerAs('reasoning', () => {
  const defaultModelId = required('REASONING_MODEL_ID');
  return {
    apiKey: required('ANTHROPIC_API_KEY'),
    defaultModel: { modelId: defaultModelId, effort: 'high' } satisfies ReasoningModelSettings,
    jobModel: { modelId: process.env.REASONING_JOB_MODEL_ID || defaultModelId, effort: 'high' } satisfies ReasoningModelSettings,
    taskModel: { modelId: process.env.REASONING_TASK_MODEL_ID || defaultModelId, effort: 'medium' } satisfies ReasoningModelSettings,
  };
});
