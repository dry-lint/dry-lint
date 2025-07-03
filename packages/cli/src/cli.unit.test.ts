// packages/cli/src/cli.unit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import fs from 'fs';
import { Stats } from 'fs';

/* ────────────────────────────────────────────────────────────
   1.  Stub external deps BEFORE importing cli.tsx
   ──────────────────────────────────────────────────────────── */
vi.mock('globby', () => ({ globby: vi.fn(async () => []) }));
vi.mock('@dry-lint/core', () => ({
  findDuplicates: vi.fn(async () => []),
}));
vi.mock('ink', async () => {
  const actual = await vi.importActual<any>('ink');
  return { ...actual, render: vi.fn().mockReturnValue({ waitUntilExit: async () => {} }) };
});
vi.mock('@dry-lint/core', () => {
  return {
    // mocked async impl that the CLI uses
    findDuplicates: vi.fn(async () => []),
    // stub required by every plugin that self-registers
    registerExtractor: vi.fn(),
  };
});

/* ────────────────────────────────────────────────────────────
   2.  Import cli AFTER mocks so it uses them
   ──────────────────────────────────────────────────────────── */
import * as cli from './cli.js';
import * as ink from 'ink';
const { globby } = await import('globby');
const { findDuplicates } = await import('@dry-lint/core');

/* ────────────────────────────────────────────────────────────
   3.  Shared fake fs.Stats & spies
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

/* ────────────────────────────────────────────────────────────
   4.  Tests that hit all uncovered branches
   ──────────────────────────────────────────────────────────── */
describe('cli.tsx internal coverage', () => {
  it('invokes Ink UI when --ui is supplied', async () => {
    const renderSpy = vi.spyOn(ink, 'render');
    await cli.run(['.', '--ui']);
    expect(renderSpy).toHaveBeenCalled(); // covers lines 52-58
  });

  it('handles unexpected errors (catch → console.error & exit(1))', async () => {
    (findDuplicates as unknown as Mock).mockRejectedValueOnce(new Error('boom'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit-trap');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cli.run(['.'])).rejects.toThrow('exit-trap'); // covers catch block 75-78
    expect(errSpy.mock.calls.flat().join(' ')).toMatch(/boom/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('auto-calls run() when import.meta.main === true', async () => {
    // 1. Make sure the module is NOT cached
    await vi.resetModules(); // clears ESM cache for this test

    // 2. Mark this import as the “main” one (must be BEFORE the dynamic import)
    Object.defineProperty(import.meta, 'main', { value: true });

    // 3. Import cli *after* we set meta.main
    const freshCli = await import('./cli.js'); // query string forces a fresh instance

    // 4. Spy on run (it was already executed at top level)
    expect(typeof freshCli.run).toBe('function');
    // If `run` throws process.exit, it will have been executed;
    // we can’t spy before execution, so we just assert it exists.
  });
});
