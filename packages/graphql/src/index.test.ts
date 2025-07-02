import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Test suite for the GraphQL extractor plugin, validating correct
 * extraction of SDL definitions and duplicate detection.
 */
describe('GraphQL plugin', () => {
  it('extracts object types, input types, and enums from a single SDL file', async () => {
    // Create a temporary directory and write an SDL file with multiple definitions
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-graphql-'));
    const sdlContent = `
      type User { id: ID!, name: String }
      input UserInput { name: String!, age: Int }
      enum Role { ADMIN, USER, GUEST }
    `;
    const schemaFile = path.join(tmpDir, 'schema.graphql');
    fs.writeFileSync(schemaFile, sdlContent);

    // Run duplicate detection on the single file; expect no groups since all types differ
    const groups = await findDuplicates([schemaFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate type definitions across multiple SDL files', async () => {
    // Create a temporary directory and two identical SDL files defining type Foo
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-graphql-dup-'));
    const typeDef = 'type Foo { x: Int }';
    const fileA = path.join(tmpDir, 'a.graphql');
    const fileB = path.join(tmpDir, 'b.graphql');
    fs.writeFileSync(fileA, typeDef);
    fs.writeFileSync(fileB, typeDef);

    // Run duplicate detection on both files
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect a single duplicate group with perfect similarity
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Verify both declarations reference the same type name 'Foo'
    const typeNames = group.decls.map(d => d.location.name).sort();
    expect(typeNames).toEqual(['Foo', 'Foo']);
  });
});
