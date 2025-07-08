import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import '@dry-lint/typescript';
import '@dry-lint/zod';
import { findDuplicates } from '@dry-lint/dry-lint';

function writeFiles(tmp: string, files: Record<string, string>) {
  for (const [name, src] of Object.entries(files)) {
    fs.outputFileSync(path.join(tmp, name), src);
  }
}

describe('Plugin integration: TS + Zod', () => {
  it('merges a TS interface and an equivalent Zod object schema', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-integration-'));

    // 1) TS interface
    const tsCode = `export interface Foo { x: number; y: string }`;
    // 2) Zod schema with identical shape
    const zodCode = `
      import { z } from 'zod';
      export const Foo = z.object({ x: z.number(), y: z.string() });
    `;

    writeFiles(tmp, {
      'foo.ts': tsCode,
      'fooSchema.ts': zodCode,
    });

    // 3) Run the duplicate finder over both files
    const groups = await findDuplicates(
      [path.join(tmp, 'foo.ts'), path.join(tmp, 'fooSchema.ts')],
      {
        threshold: 1,
        json: true,
      }
    );

    // 4) We expect exactly ONE group, with similarity 1
    expect(groups).toHaveLength(1);
    const g = groups[0]!;
    expect(g.similarity).toBe(1);

    // And it should include one TS decl and one Zod decl
    const kinds = g.decls.map(d => d.kind).sort();
    expect(kinds).toEqual(['ts-interface', 'zodobject']);

    const files = g.decls.map(d => path.basename(d.location.file)).sort();
    expect(files).toEqual(['foo.ts', 'fooSchema.ts']);
  });
});
