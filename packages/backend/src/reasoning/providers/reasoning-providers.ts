import type { ReasoningProviderName } from '../types/reasoning-provider-name';
import { AnthropicReasoningProvider } from './anthropic-reasoning.provider';
import { MuseReasoningProvider } from './muse-reasoning.provider';
import type { ReasoningProvider } from './reasoning-provider';

/** The env var that holds each provider's key, named in the error when it is missing. */
const API_KEY_ENV: Record<ReasoningProviderName, string> = { anthropic: 'ANTHROPIC_API_KEY', muse: 'META_API_KEY' };

const BUILDERS: Record<ReasoningProviderName, (apiKey: string) => ReasoningProvider> = {
  anthropic: (apiKey) => AnthropicReasoningProvider.create(apiKey),
  muse: (apiKey) => MuseReasoningProvider.create(apiKey),
};

/**
 * The reasoning providers, built on first use and shared by every level that names them. A provider no
 * level uses needs no key.
 */
export class ReasoningProviders {
  private readonly built = new Map<ReasoningProviderName, ReasoningProvider>();

  constructor(private readonly apiKeys: Readonly<Partial<Record<ReasoningProviderName, string>>>) {}

  /** The provider called `name`. Throws when its key is not set. */
  get(name: ReasoningProviderName): ReasoningProvider {
    const existing = this.built.get(name);
    if (existing !== undefined) return existing;
    const apiKey = this.apiKeys[name];
    if (apiKey === undefined) throw new Error(`${API_KEY_ENV[name]} is not set, but a reasoning level uses ${name}`);
    const provider = BUILDERS[name](apiKey);
    this.built.set(name, provider);
    return provider;
  }
}
