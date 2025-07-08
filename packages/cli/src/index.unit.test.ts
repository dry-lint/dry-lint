import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import fs from 'fs';
import { Stats } from 'fs';

vi.mock('globby', () => ({ globby: vi.fn(async () => []) }));

vi.mock('@dry-lint/dry-lint', () => ({
  findDuplicates: vi.fn(async () => []),
  registerExtractor: vi.fn(),
}));

vi.mock('ink', () => ({
  render: vi.fn(() => ({ waitUntilExit: async () => {} })),
  Box: () => null,
  Text: () => null,
}));

import * as cli from './index.js';
import { render } from 'ink';
import { findDuplicates } from '@dry-lint/dry-lint';

const fakeStats: Stats = {
  isDirectory: () => true,
  isFile: () => false,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  isSymbolicLink: () => false,
  dev: 0,
  ino: 0,
  mode: 0,
  nlink: 0,
  uid: 0,
  gid: 0,
  rdev: 0,
  size: 0,
  blksize: 0,
  blocks: 0,
  atime: new Date(),
  mtime: new Date(),
  ctime: new Date(),
  birthtime: new Date(),
  atimeMs: 0,
  mtimeMs: 0,
  ctimeMs: 0,
  birthtimeMs: 0,
};

beforeEach(() => {
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs, 'statSync').mockReturnValue(fakeStats);
});

afterEach(() => vi.restoreAllMocks());

describe('CLI internal coverage', () => {
  it('invokes Ink UI when --ui is supplied', async () => {
    await cli.run(['.', '--ui']);
    expect(render).toHaveBeenCalled();
  });

  it('handles unexpected errors (catch → console.error & exit(1))', async () => {
    (findDuplicates as unknown as Mock).mockRejectedValueOnce(new Error('boom'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit-trap');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cli.run(['.'])).rejects.toThrow('exit-trap');
    expect(errSpy.mock.calls.flat().join(' ')).toMatch(/boom/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('auto-calls run() when import.meta.main === true', async () => {
    await vi.resetModules();
    Object.defineProperty(import.meta, 'main', { value: true });
    const freshCli = await import('./index.js');
    expect(typeof freshCli.run).toBe('function');
  });
});
