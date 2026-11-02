import { executionConfig } from '../execution.config';

const EXECUTION_ENV = [
  'EXECUTION_PROVIDER',
  'EXECUTION_MODEL_ID',
  'ANTHROPIC_API_KEY',
  'META_API_KEY',
  'SCREENSHOT_MAX_WIDTH',
  'SCREENSHOT_MAX_HEIGHT',
];

describe('executionConfig', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  function load(overrides: Record<string, string>) {
    process.env = { ...env };
    for (const name of EXECUTION_ENV) delete process.env[name];
    Object.assign(process.env, overrides);
    return executionConfig();
  }

  it('runs Claude with the Anthropic key by default', () => {
    expect(load({ ANTHROPIC_API_KEY: 'anthropic-key' })).toEqual({
      providerName: 'anthropic',
      apiKey: 'anthropic-key',
      modelId: 'claude-sonnet-5-5',
      maxScreenshotWidth: 1280,
      maxScreenshotHeight: 800,
    });
  });

  it('runs Muse Wonder with the Meta key, and needs no Anthropic key', () => {
    expect(load({ EXECUTION_PROVIDER: 'muse', META_API_KEY: 'meta-key' })).toMatchObject({
      providerName: 'muse',
      apiKey: 'meta-key',
      modelId: 'muse-wonder-1.0',
    });
  });

  it('takes the model and the screenshot size from the env', () => {
    expect(
      load({
        ANTHROPIC_API_KEY: 'key',
        EXECUTION_MODEL_ID: 'claude-haiku-5-5',
        SCREENSHOT_MAX_WIDTH: '1024',
        SCREENSHOT_MAX_HEIGHT: '640',
      }),
    ).toMatchObject({ modelId: 'claude-haiku-5-5', maxScreenshotWidth: 1024, maxScreenshotHeight: 640 });
  });

  it('names the missing key of the chosen provider', () => {
    expect(() => load({ EXECUTION_PROVIDER: 'muse', ANTHROPIC_API_KEY: 'key' })).toThrow(
      'META_API_KEY is not set, but EXECUTION_PROVIDER is muse',
    );
  });

  it('refuses an unknown provider', () => {
    expect(() => load({ EXECUTION_PROVIDER: 'openai' })).toThrow('EXECUTION_PROVIDER must be one of anthropic, muse, not "openai"');
  });
});
