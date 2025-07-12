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
});
