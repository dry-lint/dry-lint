import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './loadConfig.js';

const searchMock = vi.fn();

vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({ search: searchMock })),
}));

beforeEach(() => searchMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('loadConfig', () => {
  it('returns parsed config when explorer finds one', async () => {
    const fakeConfig = { plugins: ['@dry-lint/typescript'] };
    searchMock.mockResolvedValue({ config: fakeConfig });

    const result = await loadConfig('/fake/cwd');
    expect(result).toEqual({
      cache: true,
      fix: false,
      ignore: [],
      json: false,
      plugins: ['@dry-lint/typescript'],
      pool: expect.any(Number),
      progress: true,
      sarif: false,
      threshold: 1,
      ui: false,
    });
    expect(searchMock).toHaveBeenCalledWith('/fake/cwd');
  });

  it('returns empty object when no config is found', async () => {
    searchMock.mockResolvedValue(null);

    const result = await loadConfig('/missing/cwd');
    expect(result).toEqual({
      cache: true,
      fix: false,
      ignore: [],
      json: false,
      pool: expect.any(Number),
      progress: true,
      sarif: false,
      threshold: 1,
      ui: false,
    });
  });

  it('logs errors and exits when config fails validation', async () => {
    searchMock.mockResolvedValue({ config: { threshold: 'not-a-number' } });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?) => {
      throw new Error(`EXIT:${code}`);
    });

    await expect(loadConfig('/bad/cwd')).rejects.toThrow('EXIT:1');

    expect(errorSpy).toHaveBeenNthCalledWith(1, '❌  Invalid .drylintrc\n');
    const issueCalls = errorSpy.mock.calls.slice(1).map(args => args[0]);
    expect(issueCalls.some(line => line.includes('threshold'))).toBe(true);

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
