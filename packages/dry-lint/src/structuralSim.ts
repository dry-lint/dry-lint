import levenshtein from 'fast-levenshtein';
import stringify from 'fast-json-stable-stringify';
import { normalizeShape } from './normalizeShape.js';

export function structuralSim(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const sa = stringify(normalizeShape(a));
  const sb = stringify(normalizeShape(b));

  const distance = levenshtein.get(sa, sb);
  const avgLen = (sa.length + sb.length) / 2;

  return Math.max(0, 1 - distance / avgLen);
}
