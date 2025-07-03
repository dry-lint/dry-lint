import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// helpers
const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'avro-'));
const writeFile = (dir: string, name: string, data: string) =>
  fs.writeFileSync(path.join(dir, name), data);

// ensure extractor is registered before testing
const load = async () => {
  await import('./index.js');
  const { findDuplicates } = await import('@dry-lint/core');
  return findDuplicates;
};

describe('Avro JSON extractor', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const simple = JSON.stringify({
    type: 'record',
    name: 'User',
    fields: [
      { name: 'id', type: 'string' },
      { name: 'age', type: 'int' },
    ],
  });

  const nested = JSON.stringify({
    type: 'record',
    name: 'Outer',
    fields: [
      {
        name: 'inner',
        type: {
          type: 'record',
          name: 'Inner',
          fields: [{ name: 'flag', type: 'boolean' }],
        },
      },
    ],
  });

  it('extracts top-level record', async () => {
    const dir = mkTmp();
    writeFile(dir, 'user.avsc', simple);

    const groups = await (
      await load()
    )([path.join(dir, 'user.avsc')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('extracts nested records', async () => {
    const dir = mkTmp();
    writeFile(dir, 'nested.avsc', nested);

    const groups = await (
      await load()
    )([path.join(dir, 'nested.avsc')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate records across files', async () => {
    const dir = mkTmp();
    writeFile(dir, 'a.avsc', simple);
    writeFile(dir, 'b.avsc', simple);

    const groups = await (
      await load()
    )([path.join(dir, 'a.avsc'), path.join(dir, 'b.avsc')], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.similarity).toBe(1);
    const names = groups[0]!.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['User', 'User']);
  });

  it('treats distinct records below threshold as unique', async () => {
    const a = JSON.stringify({ type: 'record', name: 'A', fields: [] });
    const b = JSON.stringify({ type: 'record', name: 'B', fields: [] });
    const dir = mkTmp();
    writeFile(dir, 'a.avsc', a);
    writeFile(dir, 'b.avsc', b);

    const groups = await (
      await load()
    )([path.join(dir, 'a.avsc'), path.join(dir, 'b.avsc')], { threshold: 0.9, json: true });
    expect(groups).toHaveLength(0);
  });

  it('ignores non-record schemas', async () => {
    const nonRecord = JSON.stringify({
      type: 'enum',
      name: 'E',
      symbols: ['X', 'Y'],
    });
    const dir = mkTmp();
    writeFile(dir, 'enum.avsc', nonRecord);

    const groups = await (
      await load()
    )([path.join(dir, 'enum.avsc')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('handles JSON parse errors gracefully', async () => {
    const dir = mkTmp();
    writeFile(dir, 'bad.avsc', '{ not valid JSON');

    const groups = await (
      await load()
    )([path.join(dir, 'bad.avsc')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalled();
  });
});
