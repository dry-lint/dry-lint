import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { findDuplicates } from '@dry-lint/dry-lint';
import './index';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dry-typeorm-'));
const write = (dir: string, name: string, content: string) =>
  fs.writeFileSync(path.join(dir, name), content);

describe('TypeORM extractor plugin', () => {
  it('ignores files without @Entity decorator', async () => {
    const dir = tmp();
    write(
      dir,
      'noentity.ts',
      `
      class NotEntity {
        @Column() field: string;
      }
    `
    );
    const groups = await findDuplicates([path.join(dir, 'noentity.ts')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toEqual([]);
  });

  it('extracts @Entity classes and their @Column props', async () => {
    const dir = tmp();
    write(
      dir,
      'user.ts',
      `
      import { Entity, Column } from 'typeorm';
      @Entity()
      class User {
        @Column() email: string;
        @Column({ name: 'is_active' }) active: boolean;
      }
    `
    );

    const groups = await findDuplicates([path.join(dir, 'user.ts')], { threshold: 1, json: true });

    expect(groups).toHaveLength(0);
  });

  it('treats classes without properties as entities with empty props', async () => {
    const dir = tmp();
    write(
      dir,
      'empty.ts',
      `
      import { Entity, Column } from 'typeorm';
      @Entity()
      class Empty {}
    `
    );
    const groups = await findDuplicates([path.join(dir, 'empty.ts')], { threshold: 1, json: true });
    expect(groups).toEqual([]);
  });

  it('detects duplicate entities across multiple files', async () => {
    const dir = tmp();
    const code = `
      import { Entity, Column } from 'typeorm';
      @Entity()
      class Foo {
        @Column() x: number;
      }
    `;
    write(dir, 'a.ts', code);
    write(dir, 'b.ts', code);

    const groups = await findDuplicates([path.join(dir, 'a.ts'), path.join(dir, 'b.ts')], {
      threshold: 1,
      json: true,
    });

    expect(groups).toHaveLength(1);
    const grp = groups[0]!;
    expect(grp.similarity).toBe(1);

    const names = grp.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['Foo', 'Foo']);

    const propsA = (grp.decls[0]!.shape as any).props as Array<{ name: string; type: string }>;
    expect(propsA).toEqual([{ name: 'x', type: 'number' }]);
  });
});
