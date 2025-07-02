import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Test suite for the Prisma schema extractor plugin.
 * Verifies parsing of models and enums, and duplicate detection.
 */
describe('Prisma plugin', () => {
  it('extracts models and enums from a single schema.prisma file', async () => {
    // Create a temporary directory and write a Prisma schema file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-prisma-'));
    const schemaContent = `
      datasource db {
        provider = "sqlite"
        url      = "file:dev.db"
      }

      model User {
        id    Int    @id @default(autoincrement())
        name  String
      }

      enum Role {
        ADMIN
        USER
      }
    `;
    const schemaFile = path.join(tmpDir, 'schema.prisma');
    fs.writeFileSync(schemaFile, schemaContent);

    // Run the extractor and group declarations; expect no duplicates for distinct model & enum
    const groups = await findDuplicates([schemaFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate models across multiple schema.prisma files', async () => {
    // Prepare two schema files defining the same model
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-prisma-dup-'));
    const modelDef = `
      model Foo {
        id Int @id
      }
    `;
    const fileA = path.join(tmpDir, 'a.prisma');
    const fileB = path.join(tmpDir, 'b.prisma');
    fs.writeFileSync(fileA, modelDef);
    fs.writeFileSync(fileB, modelDef);

    // Run duplicate detection at full similarity threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect one duplicate group with similarity 1
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Verify both declarations reference the same model name 'Foo'
    const modelNames = group.decls.map(d => d.location.name).sort();
    expect(modelNames).toEqual(['Foo', 'Foo']);
  });
});
