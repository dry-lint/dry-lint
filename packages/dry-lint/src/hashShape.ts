import stringify from 'fast-json-stable-stringify';
import { createHash } from 'node:crypto';

export function hashShape<T extends object>(shape: T): string {
  const stable = stringify(shape);
  return createHash('sha1').update(stable).digest('hex');
}
