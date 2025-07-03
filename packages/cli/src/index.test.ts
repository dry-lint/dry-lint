import { describe, it, beforeEach, afterEach, expect, vi, type Mock } from 'vitest';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Stats } from 'fs';
import path from 'path';

/**
 * ---------------------------------------------------------------------------
 * Test setup
 * ---------------------------------------------------------------------------
 * 1. Stub all external dependencies _before_ loading the CLI module.
 *    - globby → fixed list of files
 *    - @dry-lint/core → spyable stubs for `findDuplicates` / `registerExtractor`
 *    - loadConfig → returns an empty plugin list to avoid I/O
 *    - ink.render → stub so no real UI is rendered during tests
 */

vi.mock('globby', () => ({ globby: vi.fn(async () => ['/abs/f1.ts']) }));

vi.mock('@dry-lint/core', () => ({
  findDuplicates: vi.fn(async () => []),
  registerExtractor: vi.fn(),
}));

vi.mock('./loadConfig.js', () => ({ loadConfig: async () => ({ plugins: [] }) }));

vi.mock('ink', async () => {
  const actual = await vi.importActual<any>('ink');
  return { ...actual, render: vi.fn().mockReturnValue({ waitUntilExit: async () => {} }) };
});

// CLI must be imported _after_ mocks so it picks up the stubs.
import { run, program } from './index.js';
import { findDuplicates } from '@dry-lint/core';
import * as ink from 'ink';

/**
 * Fake fs.Stats object returned by `fs.statSync` in all tests.
 */
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
  // Stub filesystem checks so CLI always believes the directory exists.
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs, 'statSync').mockReturnValue(fakeStats);

  // Prevent the zero‑config fallback from reading a real package.json.
  vi.spyOn(fsPromises, 'readFile').mockResolvedValue(
    JSON.stringify({ dependencies: {}, devDependencies: {} })
  );
});

afterEach(() => vi.restoreAllMocks());

/**
 * ---------------------------------------------------------------------------
 * Branch‑coverage tests
 * ---------------------------------------------------------------------------
 */

describe('CLI – branch coverage (dynamic‑plugin build)', () => {
  it('launches Ink UI when --ui is provided', async () => {
    await run(['.', '--ui', '--threshold', '0.9']);
    expect((ink.render as Mock).mock.calls.length).toBe(1);
  });

  it('converts relative --out into an absolute path', async () => {
    const dupSpy = findDuplicates as Mock;
    await run(['.', '--json', '--out', 'rel/report.json']);
    expect(dupSpy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ outFile: path.join('.', 'rel', 'report.json') })
    );
  });

  it('passes absolute --out path through unchanged', async () => {
    const abs = path.resolve('/tmp/out.json');
    await run(['.', '--json', '--out', abs]);
    expect((findDuplicates as Mock).mock.calls.at(-1)?.[1].outFile).toBe(abs);
  });

  it('honours --no-cache flag', async () => {
    vi.spyOn(program, 'opts').mockReturnValue({
      json: true,
      noCache: true,
      ignore: [],
      threshold: 1,
    });
    program.args = ['.'];

    await run([]);
    expect((findDuplicates as Mock).mock.calls.at(-1)?.[1].cache).toBe(false);
  });

  it('exits with code 1 when directory is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('trap-exit');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(run(['./nope'])).rejects.toThrow('trap-exit');
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('nope'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 if findDuplicates rejects', async () => {
    (findDuplicates as Mock).mockRejectedValueOnce(new Error('boom'));

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('trap-exit');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(run(['.'])).rejects.toThrow('trap-exit');
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
