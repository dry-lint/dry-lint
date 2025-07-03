import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

// helpers
const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-'));
const write = (dir: string, name: string, contents: string) =>
  fs.writeFileSync(path.join(dir, name), contents);

describe('GraphQL extractor', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  const complexSDL = `
    scalar DateTime

    type Post {
      id: ID!
      tags: [String!]!
      createdAt: DateTime
    }

    input PostFilter {
      tags: [String!]
      limit: Int = 10
    }

    enum Color {
      RED
      GREEN
      BLUE
    }

    union MaybePost = Post | Null
  `;

  it('extracts object, input, and enum but skips scalar/union', async () => {
    const dir = mk();
    write(dir, 'schema.graphql', complexSDL);

    const groups = await findDuplicates([path.join(dir, 'schema.graphql')], {
      threshold: 1,
      json: true,
    });
    // three declarations: Post, PostFilter, Color
    expect(groups).toHaveLength(0);
  });

  it('normalizes list and non-null types correctly', async () => {
    const sdl = `
      type Bag {
        items: [[Int!]!]!
      }
    `;
    const dir = mk();
    write(dir, 'bag.graphql', sdl);

    const groups = await findDuplicates([path.join(dir, 'bag.graphql')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate type definitions across files', async () => {
    const sdl = 'type Dup { x: String }';
    const dir = mk();
    write(dir, 'a.graphql', sdl);
    write(dir, 'b.graphql', sdl);

    const groups = await findDuplicates(
      [path.join(dir, 'a.graphql'), path.join(dir, 'b.graphql')],
      { threshold: 1, json: true }
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.similarity).toBe(1);
    const names = groups[0]!.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['Dup', 'Dup']);
  });

  it('detects duplicate enums and inputs separately', async () => {
    const enumSDL = 'enum E { A B }';
    const inputSDL = 'input I { f: Boolean }';
    const dir = mk();
    write(dir, 'a1.graphql', enumSDL);
    write(dir, 'a2.graphql', enumSDL);
    write(dir, 'b1.graphql', inputSDL);
    write(dir, 'b2.graphql', inputSDL);

    const groups = await findDuplicates(
      [
        path.join(dir, 'a1.graphql'),
        path.join(dir, 'a2.graphql'),
        path.join(dir, 'b1.graphql'),
        path.join(dir, 'b2.graphql'),
      ],
      { threshold: 1, json: true }
    );
    expect(groups).toHaveLength(2);
    const kinds = groups.map(g => g.decls[0]!.shape.kind).sort();
    expect(kinds).toEqual(['EnumType', 'InputObject']);
  });

  it('treats definitions below threshold as unique', async () => {
    const a = 'type T { x: Int }';
    const b = 'type T { x: Int! }';
    const dir = mk();
    write(dir, 'a.graphql', a);
    write(dir, 'b.graphql', b);

    const groups = await findDuplicates(
      [path.join(dir, 'a.graphql'), path.join(dir, 'b.graphql')],
      { threshold: 0.95, json: true }
    );
    expect(groups).toHaveLength(0);
  });
});
