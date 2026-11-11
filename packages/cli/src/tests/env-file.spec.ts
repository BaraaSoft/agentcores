import { defaultEnv, missingKeys, parseEnv, providersInUse, setEnvValues, useProviderEverywhere } from '../env-file';

describe('setEnvValues', () => {
  it('changes a key in place and keeps the comments', () => {
    const text = '# keys\nANTHROPIC_API_KEY=\nPORT=3088\n';

    expect(setEnvValues(text, { ANTHROPIC_API_KEY: 'sk-1' })).toBe('# keys\nANTHROPIC_API_KEY=sk-1\nPORT=3088\n');
  });

  it('adds a key that the text does not have', () => {
    expect(setEnvValues('PORT=3088', { META_API_KEY: 'm-1' })).toBe('PORT=3088\nMETA_API_KEY=m-1\n');
  });

  it('keeps a value that contains = and special characters', () => {
    const text = setEnvValues('KEY=\n', { KEY: 'a=b&c$d' });

    expect(parseEnv(text).get('KEY')).toBe('a=b&c$d');
  });
});

describe('missingKeys', () => {
  it('asks for the Anthropic key with the default settings', () => {
    expect(missingKeys(parseEnv(defaultEnv()))).toEqual(['ANTHROPIC_API_KEY']);
  });

  it('asks for the Meta key when every layer uses Muse', () => {
    const text = setEnvValues(defaultEnv(), useProviderEverywhere('muse'));

    expect(providersInUse(parseEnv(text))).toEqual(['muse']);
    expect(missingKeys(parseEnv(text))).toEqual(['META_API_KEY']);
  });

  it('asks for nothing when the key is set', () => {
    const text = setEnvValues(defaultEnv(), { ANTHROPIC_API_KEY: 'sk-1' });

    expect(missingKeys(parseEnv(text))).toEqual([]);
  });
});

describe('defaultEnv', () => {
  it('writes a new random admin password each time', () => {
    const first = parseEnv(defaultEnv()).get('ADMIN_PASSWORD');

    expect(first).toHaveLength(16);
    expect(first).not.toBe(parseEnv(defaultEnv()).get('ADMIN_PASSWORD'));
  });
});
