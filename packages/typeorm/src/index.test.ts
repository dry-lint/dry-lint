import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Test suite for the TypeORM entity extractor plugin.
 * Validates extraction of @Entity-decorated classes with @Column properties
 * and duplicate detection across files.
 */
describe('TypeORM plugin', () => {
  it('extracts @Entity classes with @Column properties', async () => {
    // Create a temporary directory and write a TypeScript file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-typeorm-'));
    const code = `
      import { Entity, Column } from "typeorm";
      @Entity()
      class User {
        @Column() email: string;
        @Column() active: boolean;
      }
    `;
    const filePath = path.join(tmpDir, 'user.ts');
    fs.writeFileSync(filePath, code);

    // Run duplicate detection; expect no duplicates for single entity
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate @Entity classes across separate files', async () => {
    // Prepare two files defining the same entity class
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-typeorm-dup-'));
    const snippet = `
      import { Entity, Column } from "typeorm";
      @Entity()
      class Foo { @Column() x: number; }
    `;
    const fileA = path.join(tmpDir, 'a.ts');
    const fileB = path.join(tmpDir, 'b.ts');
    fs.writeFileSync(fileA, snippet);
    fs.writeFileSync(fileB, snippet);

    // Run duplicate detection across both files
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Validate both declarations reference the class name 'Foo'
    const names = group.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['Foo', 'Foo']);
  });
});
