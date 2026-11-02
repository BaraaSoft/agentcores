import { createComputerUseProvider } from '../create-computer-use-provider';
import { createExecutionProvider } from '../create-execution-provider';
import { createMuseComputerUseProvider } from '../muse/create-muse-computer-use-provider';

jest.mock('../create-computer-use-provider', () => ({ createComputerUseProvider: jest.fn(() => 'claude provider') }));
jest.mock('../muse/create-muse-computer-use-provider', () => ({ createMuseComputerUseProvider: jest.fn(() => 'muse provider') }));

describe('createExecutionProvider', () => {
  const options = { apiKey: 'key', modelId: 'model', maxScreenshotWidth: 1280 };

  afterEach(() => jest.clearAllMocks());

  it('builds the Claude loop for anthropic, without the provider name', () => {
    expect(createExecutionProvider({ providerName: 'anthropic', ...options })).toBe('claude provider');
    expect(createComputerUseProvider).toHaveBeenCalledWith(options);
    expect(createMuseComputerUseProvider).not.toHaveBeenCalled();
  });

  it('builds the Muse loop for muse', () => {
    expect(createExecutionProvider({ providerName: 'muse', ...options })).toBe('muse provider');
    expect(createMuseComputerUseProvider).toHaveBeenCalledWith(options);
    expect(createComputerUseProvider).not.toHaveBeenCalled();
  });
});
