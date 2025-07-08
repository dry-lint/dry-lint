import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Test suite for the Thrift IDL extractor plugin.
 * Validates correct extraction of structs and enums and duplicate detection.
 */
describe('Thrift IDL plugin', () => {
  it('extracts struct and enum definitions from a single .thrift file', async () => {
    // Prepare a temporary directory and write a .thrift file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-thrift-'));
    const thriftContent = `
      struct User {
        1: i32 id;
        2: string name;
      }

      enum Role {
        ADMIN = 1,
        USER = 2
      }
    `;
    const thriftFile = path.join(tmpDir, 'defs.thrift');
    fs.writeFileSync(thriftFile, thriftContent);

    // Run duplicate detection; expect two distinct declarations and no duplicates
    const groups = await findDuplicates([thriftFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate struct definitions across separate .thrift files', async () => {
    // Create two temporary .thrift files defining the same struct
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-thrift-dup-'));
    const structSnippet = `
      struct Foo {
        1: i32 x;
      }
    `;
    const fileA = path.join(tmpDir, 'a.thrift');
    const fileB = path.join(tmpDir, 'b.thrift');
    fs.writeFileSync(fileA, structSnippet);
    fs.writeFileSync(fileB, structSnippet);

    // Run duplicate detection on both files with 100% similarity threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });
    // Expect exactly one duplicate group for the Foo struct
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);
    // Verify both declarations refer to the same struct name 'Foo'
    const structNames = group.decls.map(d => d.location.name).sort();
    expect(structNames).toEqual(['Foo', 'Foo']);
  });
});
