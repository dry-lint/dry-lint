import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// helpers
const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mongoose-'));
const write = (dir: string, name: string, code: string) =>
  fs.writeFileSync(path.join(dir, name), code);

// lazy-load extractor
const load = async () => {
  await import('./index.js');
  const { findDuplicates } = await import('@dry-lint/core');
  return findDuplicates;
};

describe('Mongoose schema extractor', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('ignores classes without @Schema decorator', async () => {
    const dir = mkTmp();
    write(
      dir,
      'no-schema.ts',
      `
      import { Prop } from "nestjs/mongoose";
      class Unrelated { @Prop() x: string; }
    `
    );
    const groups = await (
      await load()
    )([path.join(dir, 'no-schema.ts')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('extracts a schema class even if it has no @Prop properties', async () => {
    const dir = mkTmp();
    write(
      dir,
      'empty.ts',
      `
      import { Schema } from "nestjs/mongoose";
      @Schema()
      class Empty {}
    `
    );
    const groups = await (
      await load()
    )([path.join(dir, 'empty.ts')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0); // one declaration but no duplicates
  });

  it('treats properties without type annotation as any', async () => {
    const dir = mkTmp();
    write(
      dir,
      'anytype.ts',
      `
      import { Schema, Prop } from "nestjs/mongoose";
      @Schema()
      class A {
        @Prop() z;
      }
    `
    );
    const groups = await (
      await load()
    )([path.join(dir, 'anytype.ts')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('processes multiple classes but only decorated ones', async () => {
    const dir = mkTmp();
    write(
      dir,
      'multi.ts',
      `
      import { Schema, Prop } from "nestjs/mongoose";
      @Schema() class First { @Prop() a: number; }
      class Second { @Prop() b: string; }
      @Schema() class Third {}
    `
    );
    const groups = await (
      await load()
    )([path.join(dir, 'multi.ts')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate schemas across files', async () => {
    const dir = mkTmp();
    const snippet = `
      import { Schema, Prop } from "nestjs/mongoose";
      @Schema() class Foo { @Prop() x: number; }
    `;
    write(dir, 'a.ts', snippet);
    write(dir, 'b.ts', snippet);

    const groups = await (
      await load()
    )([path.join(dir, 'a.ts'), path.join(dir, 'b.ts')], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);
    const g = groups[0]!;
    expect(g.similarity).toBe(1);
    expect(g.decls.map(d => d.location.name).sort()).toEqual(['Foo', 'Foo']);
  });
});
