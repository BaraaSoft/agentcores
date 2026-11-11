/**
 * Who serves a model: Anthropic (Claude) or Meta (Muse, through its Anthropic-compatible Messages API).
 * Every package reads providers from here, so adding one is a change to this file plus its builders.
 */
export const MODEL_PROVIDERS = ['anthropic', 'muse'] as const;

export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

/** The provider a layer runs when its `*_PROVIDER` env var is not set. */
export const DEFAULT_MODEL_PROVIDER: ModelProvider = 'anthropic';

export interface ModelProviderInfo {
  /** The name people see, for example in `agentcores init`. */
  readonly label: string;
  /** The env var that holds the provider's API key. */
  readonly apiKeyEnv: string;
  /** The model each kind of layer runs when its `*_MODEL_ID` env var is not set. */
  readonly defaultModelIds: { readonly reasoning: string; readonly execution: string };
}

export const MODEL_PROVIDER_INFO: Readonly<Record<ModelProvider, ModelProviderInfo>> = {
  anthropic: {
    label: 'Anthropic Claude',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    defaultModelIds: { reasoning: 'claude-opus-5-5', execution: 'claude-sonnet-5-5' },
  },
  muse: {
    label: 'Meta Muse',
    apiKeyEnv: 'META_API_KEY',
    defaultModelIds: { reasoning: 'muse-wonder-1.0', execution: 'muse-wonder-1.0' },
  },
};
