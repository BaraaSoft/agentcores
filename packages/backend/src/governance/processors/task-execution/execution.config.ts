import { MODEL_PROVIDER_INFO, parseModelProvider } from '@agentcores/agent-core';
import { registerAs } from '@nestjs/config';

/**
 * Execution (computer use) settings. `EXECUTION_PROVIDER` picks Claude (`anthropic`, the default) or Muse (`muse`);
 * only that provider's key is needed. `EXECUTION_MODEL_ID` overrides the provider's default model.
 */
export const executionConfig = registerAs('execution', () => {
  const name = parseModelProvider('EXECUTION_PROVIDER', process.env.EXECUTION_PROVIDER);
  const { apiKeyEnv, defaultModelIds } = MODEL_PROVIDER_INFO[name];
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) throw new Error(`${apiKeyEnv} is not set, but EXECUTION_PROVIDER is ${name}`);
  return {
    providerName: name,
    apiKey,
    modelId: process.env.EXECUTION_MODEL_ID || defaultModelIds.execution,
    maxScreenshotWidth: Number(process.env.SCREENSHOT_MAX_WIDTH || 1280),
    maxScreenshotHeight: Number(process.env.SCREENSHOT_MAX_HEIGHT || 800),
  };
});
