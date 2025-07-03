import { describe, it, expect } from 'vitest';
import { groupDeclarations, type Declaration } from './index.js';

const make = (id: string, shape: any): Declaration => ({
  id,
  kind: 'unit-test',
  shape,
  location: { file: `${id}.ts`, name: id },
});

/**
 * Unit-tests for the pure `groupDeclarations` algorithm.
 * – Focus on edge-cases and branch coverage (fuzzy threshold logic).
 */
describe('core › groupDeclarations', () => {
  it('returns one group for N ≥ 2 identical shapes (similarity 1)', () => {
    const decls = [make('a', { foo: 1 }), make('b', { foo: 1 }), make('c', { bar: 2 })];
    const out = groupDeclarations(decls);
    expect(out).toHaveLength(1);
    expect(out[0]!.similarity).toBe(1);

    const ids = out[0]!.decls.map(d => d.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('returns 0 groups when every shape hash is unique', () => {
    const decls = [make('x', { x: 1 }), make('y', { y: 2 })];
    expect(groupDeclarations(decls)).toHaveLength(0);
  });

  it('detects *fuzzy* duplicates when threshold < 1', () => {
    /*
     * Two shapes share 15/20 hex chars → intersection 15, union 25 ⇒ 0.6.
     * (The exact math isn’t important, we just need a pair with sim ≈ 0.6).
     */
    const shapeA = { a: 1, b: 2, c: 3 };
    const shapeB = { a: 1, b: 2, c: 3, d: 4 }; // superset → very similar

    const out = groupDeclarations([make('a', shapeA), make('b', shapeB)], 0.5);
    expect(out).toHaveLength(1);
    expect(out[0]!.similarity).toBeGreaterThan(0.5);
    expect(out[0]!.similarity).toBeLessThan(1);
  });

  it('does **not** group fuzzy matches below the given threshold', () => {
    const shapeA = { foo: 1 };
    const shapeB = { bar: 2 };
    const out = groupDeclarations([make('a', shapeA), make('b', shapeB)], 0.99);
    expect(out).toHaveLength(0);
  });
});
