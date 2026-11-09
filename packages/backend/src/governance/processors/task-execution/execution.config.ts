import { EXECUTION_PROVIDER_NAMES, type ExecutionProviderName } from '@agentcores/execution';
import { registerAs } from '@nestjs/config';

/** The model each provider runs when `EXECUTION_MODEL_ID` is not set. */
const DEFAULT_MODEL_IDS: Record<ExecutionProviderName, string> = { anthropic: 'claude-sonnet-5-5', muse: 'muse-wonder-1.0' };

/** The env var that holds each provider's key, named in the error when it is missing. */
const API_KEY_ENV: Record<ExecutionProviderName, string> = { anthropic: 'ANTHROPIC_API_KEY', muse: 'META_API_KEY' };

function providerName(): ExecutionProviderName {
  const value = process.env.EXECUTION_PROVIDER || 'anthropic';
  const name = EXECUTION_PROVIDER_NAMES.find((candidate) => candidate === value);
  if (name === undefined) throw new Error(`EXECUTION_PROVIDER must be one of ${EXECUTION_PROVIDER_NAMES.join(', ')}, not "${value}"`);
  return name;
}

/**
 * Execution (computer use) settings. `EXECUTION_PROVIDER` picks Claude (`anthropic`, the default) or Muse (`muse`);
 * only that provider's key is needed. `EXECUTION_MODEL_ID` overrides the provider's default model.
 */
export const executionConfig = registerAs('execution', () => {
  const name = providerName();
  const apiKey = process.env[API_KEY_ENV[name]];
  if (!apiKey) throw new Error(`${API_KEY_ENV[name]} is not set, but EXECUTION_PROVIDER is ${name}`);
  return {
    providerName: name,
    apiKey,
    modelId: process.env.EXECUTION_MODEL_ID || DEFAULT_MODEL_IDS[name],
    maxScreenshotWidth: Number(process.env.SCREENSHOT_MAX_WIDTH || 1280),
    maxScreenshotHeight: Number(process.env.SCREENSHOT_MAX_HEIGHT || 800),
  };
});
