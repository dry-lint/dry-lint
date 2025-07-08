import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Test suite for the Protocol Buffers extractor plugin.
 * Validates extraction of message and enum definitions and duplicate detection.
 */
describe('Protocol Buffers plugin', () => {
  it('extracts messages and enums from a single .proto file', async () => {
    // Create a temporary directory and write a .proto file with message and enum
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-proto-'));
    const protoContent = `
      syntax = "proto3";
      message User {
        int32 id = 1;
        string name = 2;
      }
      enum Role {
        ADMIN = 0;
        USER = 1;
      }
    `;
    const protoFile = path.join(tmpDir, 'defs.proto');
    fs.writeFileSync(protoFile, protoContent);

    // Run duplicate detection; expect no duplicate groups since declarations differ
    const groups = await findDuplicates([protoFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate message definitions across multiple .proto files', async () => {
    // Create a temporary directory and two .proto files defining the same message
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-proto-dup-'));
    const messageDef = `
      syntax = "proto3";
      message Foo { int32 x = 1; }
    `;
    const fileA = path.join(tmpDir, 'a.proto');
    const fileB = path.join(tmpDir, 'b.proto');
    fs.writeFileSync(fileA, messageDef);
    fs.writeFileSync(fileB, messageDef);

    // Run duplicate detection on both files at full similarity threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect exactly one duplicate group for the Foo message
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Both declarations should reference the message name 'Foo'
    const names = group.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['Foo', 'Foo']);
  });
});
