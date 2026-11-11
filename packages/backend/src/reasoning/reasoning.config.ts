import { MODEL_PROVIDER_INFO, MODEL_PROVIDERS, type ModelProvider, parseModelProvider } from '@agentcores/agent-core';
import { registerAs } from '@nestjs/config';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';

/** The reasoning levels with their own model. Strategy also serves Unit planning and the evaluator. */
type ReasoningLevel = 'strategy' | 'job' | 'task';

/** Task reasoning runs on every step, so it thinks with less effort. */
const EFFORT: Record<ReasoningLevel, ReasoningModelSettings['effort']> = { strategy: 'high', job: 'high', task: 'medium' };

/** One level's settings from `REASONING_<LEVEL>_PROVIDER` and `REASONING_<LEVEL>_MODEL_ID`. */
function levelSettings(level: ReasoningLevel): ReasoningModelSettings {
  const prefix = `REASONING_${level.toUpperCase()}`;
  const providerName = parseModelProvider(`${prefix}_PROVIDER`, process.env[`${prefix}_PROVIDER`]);
  const modelId = process.env[`${prefix}_MODEL_ID`] || MODEL_PROVIDER_INFO[providerName].defaultModelIds.reasoning;
  return { providerName, modelId, effort: EFFORT[level] };
}

/**
 * Reasoning model settings. Each level (Strategy, Job, Task) picks its provider, Claude or Muse, and may
 * override the model that provider runs by default. A key is needed only for a provider some level uses.
 */
export const reasoningConfig = registerAs('reasoning', () => ({
  apiKeys: Object.fromEntries(
    MODEL_PROVIDERS.map((name) => [name, process.env[MODEL_PROVIDER_INFO[name].apiKeyEnv] || undefined]),
  ) as Partial<Record<ModelProvider, string>>,
  strategy: levelSettings('strategy'),
  job: levelSettings('job'),
  task: levelSettings('task'),
}));
