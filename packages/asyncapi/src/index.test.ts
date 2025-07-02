import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Sample AsyncAPI document used for testing plugin extraction and duplicate detection.
 */
const sampleAsyncAPI = `
asyncapi: '2.0.0'
info:
  title: Test API
  version: '1.0.0'
channels:
  user/signedup:
    publish:
      message:
        name: UserSignedUp
        payload:
          type: object
          properties:
            userId:
              type: string
`;

describe('AsyncAPI plugin', () => {
  it('should extract messages and payload schemas without reporting duplicates for a single file', async () => {
    // Create a temporary directory and write a single AsyncAPI file
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-asyncapi-'));
    const file = path.join(tmp, 'asyncapi.yaml');
    fs.writeFileSync(file, sampleAsyncAPI);

    // Run duplicate detection with threshold 1; expect no duplicate groups
    const groups = await findDuplicates([file], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('should detect duplicate messages when the same document is in multiple files', async () => {
    // Prepare two files with identical AsyncAPI content
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-asyncapi-dup-'));
    const a = path.join(tmp, 'a.yaml');
    const b = path.join(tmp, 'b.yaml');
    fs.writeFileSync(a, sampleAsyncAPI);
    fs.writeFileSync(b, sampleAsyncAPI);

    // Expect one duplicate group with perfect similarity
    const groups = await findDuplicates([a, b], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Validate that both declarations reference the same channel and message name
    const names = group.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['user/signedup.UserSignedUp', 'user/signedup.UserSignedUp']);
  });
});
