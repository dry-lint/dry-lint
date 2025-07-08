import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { findDuplicates } from './findDuplicates.js';
import * as collect from './collectDeclarations.js';
import * as group from './groupDeclarations.js';
import * as cache from './cache.js';
import * as fix from './writeFixFile.js';

const testFile = path.join(process.cwd(), 'testfile.ts');
const outFile = path.join(process.cwd(), 'out.json');

describe('findDuplicates', () => {
  beforeEach(() => {
    fs.writeFileSync(testFile, 'console.log("test");', 'utf8');
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    vi.restoreAllMocks();
  });

  it('runs extractors and groups declarations', async () => {
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([
      { id: '1', kind: 'kind', shape: {}, location: { file: testFile, name: 'A' } },
    ]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([{ similarity: 1, decls: [] }]);

    const result = await findDuplicates([testFile]);

    expect(collect.collectDeclarations).toHaveBeenCalled();
    expect(group.groupDeclarations).toHaveBeenCalled();
    expect(result).toEqual([{ similarity: 1, decls: [] }]);
  });

  it('writes JSON output to console when no outFile', async () => {
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await findDuplicates([testFile], { json: true });

    expect(log).toHaveBeenCalledWith('[]');
  });

  it('writes JSON output to file when outFile is set', async () => {
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([]);

    await findDuplicates([testFile], { json: true, outFile });

    expect(fs.readFileSync(outFile, 'utf8')).toBe('[]');
  });

  it('writes SARIF output to console when no outFile', async () => {
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await findDuplicates([testFile], { sarif: true });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('"version": "2.1.0"'));
  });

  it('writes SARIF output to file when outFile is set', async () => {
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([]);

    await findDuplicates([testFile], { sarif: true, outFile });

    const content = fs.readFileSync(outFile, 'utf8');
    expect(content).toContain('"version": "2.1.0"');
  });

  it('writes fix file if fix flag and outFile are set', async () => {
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([]);
    const fixSpy = vi.spyOn(fix, 'writeFixFile').mockImplementation(() => {});

    await findDuplicates([testFile], { fix: true, outFile });

    expect(fixSpy).toHaveBeenCalled();
  });

  it('skips unchanged files using cache', async () => {
    vi.spyOn(cache, 'readCache').mockReturnValue(true);
    vi.spyOn(cache, 'writeCache').mockImplementation(() => {});
    vi.spyOn(collect, 'collectDeclarations').mockResolvedValue([]);
    vi.spyOn(group, 'groupDeclarations').mockReturnValue([]);

    const result = await findDuplicates([testFile]);
    expect(collect.collectDeclarations).toHaveBeenCalledWith([]);
    expect(result).toEqual([]);
  });
});
