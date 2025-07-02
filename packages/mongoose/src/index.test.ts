import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Test suite for the Mongoose schema extractor plugin.
 * Validates extraction of @Schema-decorated classes and duplicate detection.
 */
describe('Mongoose plugin', () => {
  it('extracts a @Schema class with @Prop properties', async () => {
    // Create a temporary directory and write a TypeScript file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-mongoose-'));
    const code = `
      import { Schema, Prop } from "nestjs/mongoose";
      @Schema()
      class User {
        @Prop() name: string;
        @Prop() age: number;
      }
    `;
    const filePath = path.join(tmpDir, 'user.ts');
    fs.writeFileSync(filePath, code);

    // Run duplicate detection on the file; expect no duplicates since only one schema
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate @Schema classes across multiple files', async () => {
    // Create a temp directory and two identical schema files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-mongoose-dup-'));
    const snippet = `
      import { Schema, Prop } from "nestjs/mongoose";
      @Schema()
      class Foo { @Prop() x: number; }
    `;
    const fileA = path.join(tmpDir, 'a.ts');
    const fileB = path.join(tmpDir, 'b.ts');
    fs.writeFileSync(fileA, snippet);
    fs.writeFileSync(fileB, snippet);

    // Run duplicate detection at full threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect exactly one duplicate group with both Foo schemas
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Validate both declarations reference the correct class name
    const names = group.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['Foo', 'Foo']);
  });
});
