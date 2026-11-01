import { AnthropicReasoningProvider } from '../anthropic-reasoning.provider';
import { MuseReasoningProvider } from '../muse-reasoning.provider';
import { ReasoningProviders } from '../reasoning-providers';

describe('ReasoningProviders', () => {
  it('builds each provider once and shares it', () => {
    const providers = new ReasoningProviders({ anthropic: 'anthropic-key', muse: 'model-key' });

    expect(providers.get('anthropic')).toBeInstanceOf(AnthropicReasoningProvider);
    expect(providers.get('muse')).toBeInstanceOf(MuseReasoningProvider);
    expect(providers.get('muse')).toBe(providers.get('muse'));
  });

  it('needs no key for a provider no level uses', () => {
    const providers = new ReasoningProviders({ muse: 'model-key' });

    expect(providers.get('muse')).toBeInstanceOf(MuseReasoningProvider);
  });

  it.each([
    ['anthropic', 'ANTHROPIC_API_KEY'],
    ['muse', 'META_API_KEY'],
  ] as const)('names the missing key when a level uses %s without one', (name, envName) => {
    expect(() => new ReasoningProviders({}).get(name)).toThrow(`${envName} is not set`);
  });
});
