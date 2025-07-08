import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/dry-lint';

/**
 * Test suite for the SQL DDL extractor plugin.
 * Validates extraction of CREATE TABLE statements and duplicate detection.
 */
describe('SQL DDL plugin', () => {
  it('extracts CREATE TABLE definitions from a .sql file without duplicates', async () => {
    // Create a temporary directory and write a SQL schema file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-sql-'));
    const ddlContent = `
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
    const sqlFile = path.join(tmpDir, 'schema.sql');
    fs.writeFileSync(sqlFile, ddlContent);

    // Run duplicate detection at full similarity threshold
    const groups = await findDuplicates([sqlFile], { threshold: 1, json: true });

    // Expect no duplicate groups since tables 'users' and 'posts' differ
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate table definitions across separate SQL files', async () => {
    // Create a temp directory and two SQL files defining the same table
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-sql-dup-'));
    const ddl = `
      CREATE TABLE foo
      (
        id INT PRIMARY KEY
      );
    `;
    const fileA = path.join(tmpDir, 'a.sql');
    const fileB = path.join(tmpDir, 'b.sql');
    fs.writeFileSync(fileA, ddl);
    fs.writeFileSync(fileB, ddl);

    // Run duplicate detection on both files
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect one duplicate group for the 'foo' table
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Verify both declarations reference the same table name 'foo'
    const tableNames = group.decls.map(d => d.location.name).sort();
    expect(tableNames).toEqual(['foo', 'foo']);
  });
});
