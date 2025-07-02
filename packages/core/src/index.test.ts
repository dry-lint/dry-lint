import type { Declaration } from './index';
import { groupDeclarations } from './index';
import { describe, expect, it } from 'vitest';

/**
 * Unit tests for the groupDeclarations function in core module.
 */
describe('core: groupDeclarations', () => {
  it('detects exact duplicates based on identical shapes', () => {
    // Prepare declarations with two identical shapes and one distinct
    const decls: Declaration[] = [
      { id: 'a', kind: 'test', shape: { foo: 1 }, location: { file: 'f1', name: 'n1' } },
      { id: 'b', kind: 'test', shape: { foo: 1 }, location: { file: 'f2', name: 'n2' } },
      { id: 'c', kind: 'test', shape: { bar: 2 }, location: { file: 'f3', name: 'n3' } },
    ];

    // Group declarations; expect one duplicate group (a & b)
    const groups = groupDeclarations(decls);
    expect(groups).toHaveLength(1);

    const group = groups[0]!;
    // Similarity should be 100% for exact matches
    expect(group.similarity).toBe(1);

    // IDs in the group should include only the duplicates
    const ids = group.decls.map(d => d.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('returns no groups when all shapes are unique', () => {
    // Prepare declarations with distinct shapes
    const decls: Declaration[] = [
      { id: 'x', kind: 'test', shape: { x: 1 }, location: { file: 'x1', name: 'x1' } },
      { id: 'y', kind: 'test', shape: { y: 2 }, location: { file: 'y1', name: 'y1' } },
    ];

    // Group declarations; expect no duplicate groups
    const groups = groupDeclarations(decls);
    expect(groups).toHaveLength(0);
  });
});
