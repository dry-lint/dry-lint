import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

describe('Avro plugin', () => {
  it('should extract record definitions from a single .avsc file without reporting duplicates', async () => {
    // Create a temporary directory for test schema files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-avro-'));

    // Define a simple Avro record schema
    const schema = {
      type: 'record',
      name: 'User',
      fields: [
        { name: 'id', type: 'long' },
        { name: 'name', type: 'string' },
      ],
    };

    // Write the schema to a .avsc file in the temp directory
    const filePath = path.join(tmpDir, 'user.avsc');
    fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));

    // Run duplicate detection; a single record should yield no duplicate groups
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('should detect duplicate record definitions when identical schemas exist in multiple files', async () => {
    // Create another temporary directory for duplicate test
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-avro-dup-'));

    // Define a record schema named 'Foo'
    const schema = {
      type: 'record',
      name: 'Foo',
      fields: [{ name: 'x', type: 'int' }],
    };

    // Write the same schema to two separate files
    const fileA = path.join(tmpDir, 'a.avsc');
    const fileB = path.join(tmpDir, 'b.avsc');
    fs.writeFileSync(fileA, JSON.stringify(schema));
    fs.writeFileSync(fileB, JSON.stringify(schema));

    // Run duplicate detection with perfect similarity threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect one group of duplicates with similarity score of 1
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Verify both declarations reference the same record name
    const recordNames = group.decls.map(d => d.location.name).sort();
    expect(recordNames).toEqual(['Foo', 'Foo']);
  });
});
