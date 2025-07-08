import { hashShape, structuralSim } from './similarity.js';
import type { Declaration, DupGroup } from './types.js';

/**
 * Groups declarations by exact shape hash and structural similarity.
 *
 * 1. Exact same hash → similarity 1
 * 2. For threshold < 1 → structuralSim compares shape JSONs
 */
export function groupDeclarations(decls: Declaration[], threshold = 1): DupGroup[] {
  const map = new Map<string, Declaration[]>();

  for (const d of decls) {
    const h = hashShape(d.shape);
    const bucket = map.get(h) || [];
    bucket.push(d);
    map.set(h, bucket);
  }

  const groups: DupGroup[] = [];

  // Exact matches: same hash => similarity 1
  for (const bucket of map.values()) {
    if (bucket.length > 1) {
      groups.push({ similarity: 1, decls: bucket });
    }
  }

  // Fuzzy matches: use structuralSim on actual shapes
  if (threshold < 1) {
    const entries = Array.from(map.entries());
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [, bucketA] = entries[i]!;
        const [, bucketB] = entries[j]!;

        // Use first decl in each bucket as the shape rep
        const a = bucketA[0]!.shape;
        const b = bucketB[0]!.shape;

        const sim = structuralSim(a, b);

        if (sim >= threshold && sim < 1) {
          groups.push({
            similarity: sim,
            decls: [...bucketA, ...bucketB],
          });
        }
      }
    }
  }

  return groups;
}
