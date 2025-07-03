import { describe, it, beforeEach, afterEach, expect, vi, type Mock } from 'vitest';
import fs from 'fs';
import { Stats } from 'fs';
import path from 'path';

/* ╭──────────────────────────────────────────────────────────╮
   │ 1.  Hard-stub all external deps *before* importing CLI   │
   ╰──────────────────────────────────────────────────────────╯ */
vi.mock('globby', () => ({
  globby: vi.fn(async () => ['/abs/f1.ts']),
}));

vi.mock('@dry-lint/core', () => {
  return {
    // used by CLI
    findDuplicates: vi.fn(async () => []),
    // required by side-effect plugins (@dry-lint/typescript/zod)
    registerExtractor: vi.fn(),
  };
});

vi.mock('ink', async () => {
  const actual = await vi.importActual<any>('ink');
  return {
    ...actual,
    // we only care that it was called
    render: vi.fn().mockReturnValue({ waitUntilExit: async () => {} }),
  };
});

/* ╭──────────────────────────────────────────────────────────╮
   │ 2.  Import CLI after mocks so it uses the stubs          │
   ╰──────────────────────────────────────────────────────────╯ */
import * as cli from './cli.js';
import { globby } from 'globby';
import { findDuplicates } from '@dry-lint/core';
import * as ink from 'ink';

/* ──────────────────────────────────────────────────────────────
   3.  Shareable fake fs.Stats & helpers
   ──────────────────────────────────────────────────────────── */
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

/* ╭──────────────────────────────────────────────────────────╮
   │ 4.  Branch-coverage tests                                │
   ╰──────────────────────────────────────────────────────────╯ */
describe('cli.tsx branch coverage', () => {
  it('--ui branch invokes Ink render', async () => {
    await cli.run(['.', '--ui', '--threshold', '0.9']);
    expect((ink.render as Mock).mock.calls.length).toBe(1); // lines 52-58
  });

  it('relative --out path is converted to absolute and handed to core', async () => {
    const dupSpy = findDuplicates as Mock;
    await cli.run(['.', '--json', '--out', 'rel/report.json']);
    expect(dupSpy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ outFile: path.join('.', 'rel', 'report.json') })
    );
  });

  it('absolute --out path is passed straight through', async () => {
    const abs = path.resolve('/tmp/out.json');
    await cli.run(['.', '--json', '--out', abs]);
    expect((findDuplicates as Mock).mock.calls.at(-1)?.[1].outFile).toBe(abs);
  });

  it('--no-cache flips the cache flag', async () => {
    vi.spyOn(cli.program, 'opts').mockReturnValue({
      json: true,
      noCache: true, // This must match the CLI flag
      ignore: [],
      threshold: 1,
    });
    cli.program.args = ['.'];

    await cli.run([]);
    expect((findDuplicates as Mock).mock.calls.at(-1)?.[1].cache).toBe(false);
  });

  it('handles missing directory -> console.error + exit(1)', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('trap-exit');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cli.run(['./nope'])).rejects.toThrow('trap-exit'); // lines 41-46
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('nope'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('catch-block on findDuplicates error logs + exits with code 1', async () => {
    (findDuplicates as Mock).mockRejectedValueOnce(new Error('boom'));

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('trap-exit');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cli.run(['.'])).rejects.toThrow('trap-exit'); // lines 75-78
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
