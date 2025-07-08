import './index';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Helper to create a temporary directory with provided files,
 * run a callback against that directory, and then clean up.
 * @param files - Map of filename to file content
 * @param fn - Async function receiving the temp directory path
 */
async function withTempFiles(files: Record<string, string>, fn: (dir: string) => Promise<void>) {
  // Create a unique temporary directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drylint-'));
  try {
    // Write each file into the temp directory
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(tmpDir, filename), content);
    }
    // Execute the provided test logic
    await fn(tmpDir);
  } finally {
    // Clean up by removing the temporary directory recursively
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Integration tests for the core findDuplicates function
 * using TypeScript interface extraction via the TS plugin.
 */
describe('integration: findDuplicates with TS plugin', () => {
  it('detects duplicate interfaces across files', async () => {
    // Set up three TypeScript files in a temp directory:
    // - a.ts and b.ts define identical Foo interfaces (order of properties swapped)
    // - c.ts defines a different Bar interface
    await withTempFiles(
      {
        'a.ts': `export interface Foo { x: number; y: string; }`,
        'b.ts': `export interface Foo { y: string; x: number; }`,
        'c.ts': `export interface Bar { z: boolean; }`,
      },
      async dir => {
        // Construct absolute file paths for the test
        const files = ['a.ts', 'b.ts', 'c.ts'].map(f => path.join(dir, f));

        // Run duplicate detection at perfect similarity (1.0)
        const groups = await findDuplicates(files, { threshold: 1 });

        // Expect exactly one duplicate group for Foo across a.ts and b.ts
        expect(groups).toHaveLength(1);
        const group = groups[0]!;
        expect(group.similarity).toBe(1);

        // Extract and sort the interface names in the duplicate group
        const names = group.decls.map(d => d.location.name).sort();
        expect(names).toEqual(['Foo', 'Foo']);
      }
    );
  });
});
