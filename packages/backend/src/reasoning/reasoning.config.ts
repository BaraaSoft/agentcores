import { registerAs } from '@nestjs/config';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} is not set`);
  return value;
}

/**
 * Reasoning model settings. Strategy and Unit use `REASONING_MODEL_ID`; Job and Task can each run
 * their own model and fall back to it. Task is the hot path (every step), so it is the first to move.
 */
export const reasoningConfig = registerAs('reasoning', () => {
  const defaultModel: ReasoningModelSettings = { modelId: required('REASONING_MODEL_ID') };
  return {
    apiKey: required('ANTHROPIC_API_KEY'),
    defaultModel,
    jobModel: { modelId: process.env.REASONING_JOB_MODEL_ID || defaultModel.modelId } satisfies ReasoningModelSettings,
    taskModel: { modelId: process.env.REASONING_TASK_MODEL_ID || defaultModel.modelId } satisfies ReasoningModelSettings,
  };
});
