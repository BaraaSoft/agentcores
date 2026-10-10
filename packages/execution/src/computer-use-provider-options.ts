import type { ActionGuard } from './actions/action-guard';

/**
 * What the backend passes in to get an ExecutionProvider. Only `apiKey` and `modelId` are required.
 */
export interface ComputerUseProviderOptions {
  readonly apiKey: string;
  readonly modelId: string;
  readonly maxTokens?: number;
  readonly maxScreenshotWidth?: number;
  readonly maxScreenshotHeight?: number;
  readonly settleDelayMs?: number;
  readonly guard?: ActionGuard;
}
