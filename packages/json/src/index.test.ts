import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jsonschema-'));
const write = (dir: string, name: string, data: string) =>
  fs.writeFileSync(path.join(dir, name), data);

describe('JSON Schema extractor', () => {
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('extracts root and definitions subschemas', async () => {
    const dir = mk();
    const schema = {
      definitions: {
        A: { type: 'object', properties: { x: { type: 'number' } } },
        B: { type: 'string' },
      },
      type: 'object',
      properties: { y: { type: 'string' } },
    };
    write(dir, 's.json', JSON.stringify(schema));

    const groups = await findDuplicates([path.join(dir, 's.json')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicates for root and each definition across files', async () => {
    const dir = mk();
    const schema = {
      definitions: { A: { type: 'boolean' } },
      type: 'string',
    };
    const content = JSON.stringify(schema);
    write(dir, 'a.json', content);
    write(dir, 'b.json', content);

    const groups = await findDuplicates([path.join(dir, 'a.json'), path.join(dir, 'b.json')], {
      threshold: 1,
      json: true,
    });
    // two groups: one for '#/' and one for '#/definitions/A'
    expect(groups).toHaveLength(2);
    for (const g of groups) {
      expect(g.similarity).toBe(1);
      const names = g.decls.map(d => d.location.name).sort();
      expect(names).toEqual([names[0], names[0]]);
    }
    const pointers = groups.map(g => g.decls[0]!.location.name).sort();
    expect(pointers).toEqual(['#/', '#/definitions/A']);
  });

  it('extracts only root when definitions missing', async () => {
    const dir = mk();
    const schema = { type: 'number' };
    write(dir, 'root.json', JSON.stringify(schema));

    const groups = await findDuplicates([path.join(dir, 'root.json')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('handles parse errors gracefully', async () => {
    const dir = mk();
    write(dir, 'bad.json', '{ invalid-json ');

    const groups = await findDuplicates([path.join(dir, 'bad.json')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
    expect(errSpy).toHaveBeenCalled();
  });
});
