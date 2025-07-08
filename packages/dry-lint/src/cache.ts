import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

const xdg = process.env.XDG_CACHE_HOME;
const base = xdg ?? os.tmpdir();

export const CACHE_DIR = path.join(base, 'dry-lint-cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Builds a stable key from a file path + its mtime.
 */
export function cacheKey(filePath: string, mtimeMs: number): string {
  return crypto
    .createHash('md5')
    .update(filePath + mtimeMs)
    .digest('hex');
}

/**
 * Returns the cached value (already JSON-parsed) or `null`.
 */
export function readCache<T>(key: string): T | null {
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null; // corrupted entry ⇒ treat as miss
  }
}

/**
 * Writes any JSON-serialisable value into the cache.
 */
export function writeCache(key: string, value: unknown): void {
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value), 'utf8');
}
