import { DEFAULT_MODEL_PROVIDER, MODEL_PROVIDERS, type ModelProvider } from './model-provider';

/** The env vars that each pick a provider: one per reasoning level, and one for execution. */
export const PROVIDER_SETTINGS = [
  'REASONING_STRATEGY_PROVIDER',
  'REASONING_JOB_PROVIDER',
  'REASONING_TASK_PROVIDER',
  'EXECUTION_PROVIDER',
] as const;

export type ProviderSetting = (typeof PROVIDER_SETTINGS)[number];

/** The provider that `envName` names. An empty value means the default. Throws for an unknown provider. */
export function parseModelProvider(envName: string, value: string | undefined): ModelProvider {
  const name = value || DEFAULT_MODEL_PROVIDER;
  const provider = MODEL_PROVIDERS.find((candidate) => candidate === name);
  if (provider === undefined) throw new Error(`${envName} must be one of ${MODEL_PROVIDERS.join(', ')}, not "${name}"`);
  return provider;
}
