import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearRegistryForTests, findDuplicates } from '@dry-lint/dry-lint';
import './index';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mongoose-cov-'));
const write = (dir: string, name: string, code: string) =>
  fs.writeFileSync(path.join(dir, name), code);

describe('Mongoose extractor deep-coverage cases', () => {
  let dir: string;
  beforeEach(async () => {
    dir = tmp();
    _clearRegistryForTests();
    vi.resetModules();
    await import('./index.js');
  });
  afterEach(() => fs.removeSync(dir));

  it('skips non-TS extensions', async () => {
    write(dir, 'ignore.js', 'console.log(1)');
    const groups = await findDuplicates([path.join(dir, 'ignore.js')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toEqual([]);
  });

  it('extracts props array from @Prop decorations', async () => {
    write(
      dir,
      'schema.ts',
      `
      import { Schema, Prop } from 'nestjs/mongoose';
      @Schema()
      class Person {
        @Prop() id!: string;
        @Prop() name!: string;
      }
    `
    );
    const groups = await findDuplicates([path.join(dir, 'schema.ts')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('handles mongoose.model calls with new Schema({...}) object literal', async () => {
    const snip = `
      import mongoose from 'mongoose';
      const PersonSchema = new mongoose.Schema({ id: String, name: String });
      export const Person = mongoose.model('Person', PersonSchema);
    `;
    write(dir, 'a.ts', snip);
    write(dir, 'b.ts', snip);

    const groups = await findDuplicates([path.join(dir, 'a.ts'), path.join(dir, 'b.ts')], {
      threshold: 1,
      json: true,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.decls.map(d => d.shape.name).sort()).toEqual(['Person', 'Person']);
    expect(groups[0]!.similarity).toBe(1);
  });

  it('detects dupes when schema class and model share identical props', async () => {
    const snip = `
  import mongoose from 'mongoose';
  const s = new mongoose.Schema({ title: String });
  export const Book = mongoose.model('Book', s);
`;
    write(dir, 'class.ts', snip);
    write(dir, 'model.ts', snip);

    const groups = await findDuplicates([path.join(dir, 'class.ts'), path.join(dir, 'model.ts')], {
      threshold: 1,
      json: true,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.decls.map(d => d.shape.kind)).toEqual(['MongooseModel', 'MongooseModel']);
  });
});
