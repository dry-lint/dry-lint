import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const searchMock = vi.fn();

vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({ search: searchMock })),
}));

import { loadConfig } from './loadConfig.js';

beforeEach(() => searchMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('loadConfig', () => {
  it('returns parsed config when explorer finds one', async () => {
    const fakeConfig = { plugins: ['@dry-lint/typescript'] };
    searchMock.mockResolvedValue({ config: fakeConfig });

    const result = await loadConfig('/fake/cwd');
    expect(result).toEqual(fakeConfig);
    expect(searchMock).toHaveBeenCalledWith('/fake/cwd');
  });

  it('returns empty object when no config is found', async () => {
    searchMock.mockResolvedValue(null);

    const result = await loadConfig('/missing/cwd');
    expect(result).toEqual({});
  });
});
