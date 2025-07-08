import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { cacheKey, readCache, writeCache, CACHE_DIR } from './cache.js';

describe('cache utils', () => {
  const testFile = path.join(process.cwd(), 'testfile.ts');
  let key: string;

  beforeEach(() => {
    // Create dummy file to simulate mtime
    fs.writeFileSync(testFile, 'console.log("test");', 'utf8');
    const mtime = fs.statSync(testFile).mtimeMs;
    key = cacheKey(testFile, mtime);
  });

  afterEach(() => {
    // Remove test file & any written cache entry
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    const cachedFile = path.join(CACHE_DIR, `${key}.json`);
    if (fs.existsSync(cachedFile)) fs.unlinkSync(cachedFile);
  });

  it('should generate a stable cache key', () => {
    const mtime = fs.statSync(testFile).mtimeMs;
    const expected = cacheKey(testFile, mtime);
    expect(expected).toBeTypeOf('string');
    expect(expected.length).toBeGreaterThan(0);
  });

  it('should write and read a valid cache entry', () => {
    const value = { foo: 'bar', n: 42 };
    writeCache(key, value);

    const cached = readCache<typeof value>(key);
    expect(cached).toEqual(value);
  });

  it('should return null if cache entry does not exist', () => {
    const result = readCache(key + '-nonexistent');
    expect(result).toBeNull();
  });

  it('should handle corrupted JSON gracefully', () => {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(filePath, '{ this is invalid JSON }', 'utf8');

    const result = readCache(key);
    expect(result).toBeNull();
  });
});
