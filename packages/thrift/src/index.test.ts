import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { findDuplicates } from '@dry-lint/dry-lint';
import * as thriftParser from '@creditkarma/thrift-parser';
import './index';

vi.mock('@creditkarma/thrift-parser', () => ({
  parse: vi.fn(),
}));

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dry-thrift-'));
const write = (dir: string, name: string, content: string) =>
  fs.writeFileSync(path.join(dir, name), content);

describe('Thrift extractor plugin', () => {
  it('ignores non-.thrift files', async () => {
    const dir = tmp();
    write(dir, 'foo.txt', 'dummy');
    const groups = await findDuplicates([path.join(dir, 'foo.txt')], { threshold: 1, json: true });
    expect(thriftParser.parse as any).not.toHaveBeenCalled();
    expect(groups).toEqual([]);
  });

  it('logs and skips on parse errors', async () => {
    (thriftParser.parse as any).mockReturnValue({ type: 'ThriftErrors', errors: ['syntax fail'] });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const dir = tmp();
    write(dir, 'bad.thrift', 'broken');
    const groups = await findDuplicates([path.join(dir, 'bad.thrift')], {
      threshold: 1,
      json: true,
    });

    expect(thriftParser.parse as any).toHaveBeenCalledWith('broken');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('⚠️ Thrift parse errors in'), [
      'syntax fail',
    ]);
    expect(groups).toEqual([]);
    spy.mockRestore();
  });

  it('extracts struct fields using names-array branch', async () => {
    (thriftParser.parse as any).mockReturnValue({
      type: 'ThriftDocument',
      body: [
        {
          type: 'StructDefinition',
          name: { value: 'StructA' },
          fields: [
            { fieldID: { value: 2 }, name: { value: 'b' }, fieldType: { names: ['B'] } },
            { fieldID: { value: 1 }, name: { value: 'a' }, fieldType: { names: ['A', 'X'] } },
          ],
        },
      ],
    });

    const dir = tmp();
    write(dir, 'one.thrift', '');
    write(dir, 'two.thrift', '');
    const one = path.join(dir, 'one.thrift');
    const two = path.join(dir, 'two.thrift');

    const groups = await findDuplicates([one, two], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);

    const decl = groups[0]!.decls[0]!;
    const fields = (decl.shape as any).fields as Array<{ id: number; name: string; type: string }>;
    expect(fields).toEqual([
      { id: 1, name: 'a', type: 'A.X' },
      { id: 2, name: 'b', type: 'B' },
    ]);
  });

  it('serializes fieldType fallback when no names array', async () => {
    (thriftParser.parse as any).mockReturnValue({
      type: 'ThriftDocument',
      body: [
        {
          type: 'StructDefinition',
          name: { value: 'Fallback' },
          fields: [{ fieldID: { value: 1 }, name: { value: 'x' }, fieldType: { foo: 'bar' } }],
        },
      ],
    });

    const dir = tmp();
    write(dir, 'a.thrift', '');
    write(dir, 'b.thrift', '');
    const groups = await findDuplicates([path.join(dir, 'a.thrift'), path.join(dir, 'b.thrift')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(1);

    const field = ((groups[0]!.decls[0]!.shape as any).fields as any[])[0];
    expect(field.type).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('extracts enum values and deduplicates correctly', async () => {
    (thriftParser.parse as any).mockReturnValue({
      type: 'ThriftDocument',
      body: [
        {
          type: 'EnumDefinition',
          name: { value: 'Role' },
          members: [{ name: { value: 'Z' } }, { name: { value: 'A' } }],
        },
      ],
    });

    const dir = tmp();
    write(dir, 'x.thrift', '');
    write(dir, 'y.thrift', '');
    const groups = await findDuplicates([path.join(dir, 'x.thrift'), path.join(dir, 'y.thrift')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(1);

    const values = (groups[0]!.decls[0]!.shape as any).values as string[];
    expect(values).toEqual(['A', 'Z']);
  });
});
