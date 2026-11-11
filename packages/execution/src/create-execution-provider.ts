import type { ExecutionProvider, ModelProvider } from '@agentcores/agent-core';
import type { ComputerUseProviderOptions } from './computer-use-provider-options';
import { createComputerUseProvider } from './create-computer-use-provider';
import type { ExecutionProviderOptions } from './execution-provider-options';
import { createMuseComputerUseProvider } from './muse/create-muse-computer-use-provider';

const BUILDERS: Record<ModelProvider, (options: ComputerUseProviderOptions) => ExecutionProvider> = {
  anthropic: createComputerUseProvider,
  muse: createMuseComputerUseProvider,
};

/**
 * Builds the ExecutionProvider for `options.providerName`, wired to the real Mac display and input.
 * This is the entry point the backend uses; each vendor keeps its own loop behind the same interface.
 */
export function createExecutionProvider({ providerName, ...options }: ExecutionProviderOptions): ExecutionProvider {
  return BUILDERS[providerName](options);
}
