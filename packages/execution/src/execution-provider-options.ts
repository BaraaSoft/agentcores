import type { ModelProvider } from '@agentcores/agent-core';
import type { ComputerUseProviderOptions } from './computer-use-provider-options';

/** What the backend passes in to get an ExecutionProvider: the vendor, plus that vendor's key and model. */
export interface ExecutionProviderOptions extends ComputerUseProviderOptions {
  readonly providerName: ModelProvider;
}
