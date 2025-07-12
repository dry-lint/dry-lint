import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

let tmpDir: string;
const writeSQL = (name: string, ddl: string) => {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, ddl);
  return p;
};

/**
 * Test suite for the SQL DDL extractor plugin.
 * Validates extraction of CREATE TABLE statements and duplicate detection.
 */
describe('SQL DDL extractor', () => {
  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-sql-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extracts distinct CREATE TABLEs (no duplicates expected)', async () => {
    const ddl = /* sql */ `
      CREATE TABLE users
      (
        id   INT PRIMARY KEY,
        name VARCHAR(100)
      );
      CREATE TABLE posts
      (
        id      INT PRIMARY KEY,
        title   TEXT,
        user_id INT
      );
    `;
    const file = writeSQL('schema.sql', ddl);

    const groups = await findDuplicates([file], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('flags identical table definitions across files', async () => {
    const ddl = /* sql */ `
      CREATE TABLE foo
      (
        id INT PRIMARY KEY
      );
    `;
    const a = writeSQL('a.sql', ddl);
    const b = writeSQL('b.sql', ddl);

    const [maybeGroup] = await findDuplicates([a, b], { threshold: 1, json: true });
    if (!maybeGroup) throw new Error('expected duplicate group');
    const group = maybeGroup;

    expect(group).toBeDefined();
    expect(group.similarity).toBe(1);
    expect(group.decls.map(d => d.location.name)).toEqual(['foo', 'foo']);
  });

  it('silently skips non-.sql files', async () => {
    const txt = writeSQL('note.txt', 'CREATE TABLE bar (x INT);');
    const groups = await findDuplicates([txt], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('logs and ignores unparsable SQL', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = writeSQL('bad.sql', 'CREAT TABLE oops (id INT);'); // typo

    const groups = await findDuplicates([bad], { threshold: 1, json: true });

    expect(groups).toHaveLength(0);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('SQL parse error in'),
      expect.any(Error)
    );
    spy.mockRestore();
  });
});
