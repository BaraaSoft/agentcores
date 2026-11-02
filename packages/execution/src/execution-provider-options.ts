import type { ComputerUseProviderOptions } from './computer-use-provider-options';
import type { ExecutionProviderName } from './types/execution-provider-name';

/** What the backend passes in to get an ExecutionProvider: the vendor, plus that vendor's key and model. */
export interface ExecutionProviderOptions extends ComputerUseProviderOptions {
  readonly providerName: ExecutionProviderName;
}
