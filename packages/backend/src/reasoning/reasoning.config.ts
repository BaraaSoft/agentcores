import { registerAs } from '@nestjs/config';
import type { ReasoningModelSettings } from './types/reasoning-model-settings';
import type { ReasoningProviderName } from './types/reasoning-provider-name';

/** The reasoning levels with their own model. Strategy also serves Unit planning and the evaluator. */
type ReasoningLevel = 'strategy' | 'job' | 'task';

const PROVIDERS: readonly ReasoningProviderName[] = ['anthropic', 'muse'];

/** The model a level runs when `REASONING_<LEVEL>_MODEL_ID` is not set. Task is the hot path, so it runs the faster model. */
const DEFAULT_MODEL_IDS: Record<ReasoningProviderName, Record<ReasoningLevel, string>> = {
  anthropic: { strategy: 'claude-opus-5-5', job: 'claude-opus-5-5', task: 'claude-opus-5-5' },
  muse: { strategy: 'muse-wonder-1.0', job: 'muse-wonder-1.0', task: 'muse-wonder-1.0' },
};

/** Task reasoning runs on every step, so it thinks with less effort. */
const EFFORT: Record<ReasoningLevel, ReasoningModelSettings['effort']> = { strategy: 'high', job: 'high', task: 'medium' };

function providerFor(envName: string): ReasoningProviderName {
  const value = process.env[envName] || 'anthropic';
  const providerName = PROVIDERS.find((name) => name === value);
  if (providerName === undefined) throw new Error(`${envName} must be one of ${PROVIDERS.join(', ')}, not "${value}"`);
  return providerName;
}

/** One level's settings from `REASONING_<LEVEL>_PROVIDER` and `REASONING_<LEVEL>_MODEL_ID`. */
function levelSettings(level: ReasoningLevel): ReasoningModelSettings {
  const prefix = `REASONING_${level.toUpperCase()}`;
  const providerName = providerFor(`${prefix}_PROVIDER`);
  const modelId = process.env[`${prefix}_MODEL_ID`] || DEFAULT_MODEL_IDS[providerName][level];
  return { providerName, modelId, effort: EFFORT[level] };
}

/**
 * Reasoning model settings. Each level (Strategy, Job, Task) picks its provider, Claude or Muse, and may
 * override the model that provider runs by default. A key is needed only for a provider some level uses.
 */
export const reasoningConfig = registerAs('reasoning', () => ({
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY || undefined,
    muse: process.env.META_API_KEY || undefined,
  } satisfies Partial<Record<ReasoningProviderName, string>>,
  strategy: levelSettings('strategy'),
  job: levelSettings('job'),
  task: levelSettings('task'),
}));
