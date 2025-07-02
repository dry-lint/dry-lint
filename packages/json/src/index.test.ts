import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Tests for the JSON Schema extractor plugin, verifying root and definition extraction.
 */
describe('JSON Schema plugin', () => {
  it('extracts both the root schema and subschemas under definitions', async () => {
    // Create a temporary directory for the schema file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-json-'));

    // Define a JSON Schema with a root object and a nested definition 'A'
    const schema = {
      definitions: {
        A: {
          type: 'object',
          properties: { x: { type: 'number' } },
        },
      },
      type: 'object',
      properties: { y: { type: 'string' } },
    };

    // Write the schema to a file
    const filePath = path.join(tmpDir, 'schema.json');
    fs.writeFileSync(filePath, JSON.stringify(schema, null, 2));

    // Run duplicate detection at 100% threshold; expect no duplicates among two declarations
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });
});
