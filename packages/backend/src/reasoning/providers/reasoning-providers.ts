import { MODEL_PROVIDER_INFO, type ModelProvider } from '@agentcores/agent-core';
import { AnthropicReasoningProvider } from './anthropic-reasoning.provider';
import { MuseReasoningProvider } from './muse-reasoning.provider';
import type { ReasoningProvider } from './reasoning-provider';

const BUILDERS: Record<ModelProvider, (apiKey: string) => ReasoningProvider> = {
  anthropic: (apiKey) => AnthropicReasoningProvider.create(apiKey),
  muse: (apiKey) => MuseReasoningProvider.create(apiKey),
};

/**
 * The reasoning providers, built on first use and shared by every level that names them. A provider no
 * level uses needs no key.
 */
export class ReasoningProviders {
  private readonly built = new Map<ModelProvider, ReasoningProvider>();

  constructor(private readonly apiKeys: Readonly<Partial<Record<ModelProvider, string>>>) {}

  /** The provider called `name`. Throws when its key is not set. */
  get(name: ModelProvider): ReasoningProvider {
    const existing = this.built.get(name);
    if (existing !== undefined) return existing;
    const apiKey = this.apiKeys[name];
    if (apiKey === undefined) {
      throw new Error(`${MODEL_PROVIDER_INFO[name].apiKeyEnv} is not set, but a reasoning level uses ${name}`);
    }
    const provider = BUILDERS[name](apiKey);
    this.built.set(name, provider);
    return provider;
  }
}
