import crypto from 'node:crypto';
import levenshtein from 'fast-levenshtein';

export function hashShape(shape: any): string {
  const json = JSON.stringify(shape);
  return crypto.createHash('sha1').update(json).digest('hex');
}

export function structuralSim(a: any, b: any) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  return 1 - levenshtein.get(sa, sb) / Math.max(sa.length, sb.length);
}
