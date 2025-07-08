import { describe, it, expect } from 'vitest';
import { groupDeclarations } from './groupDeclarations.js';

describe('groupDeclarations', () => {
  it('groups exact duplicates by hash', () => {
    const decls = [
      { id: '1', kind: 'kind', shape: { foo: 'bar' }, location: { file: 'a.ts', name: 'A' } },
      { id: '2', kind: 'kind', shape: { foo: 'bar' }, location: { file: 'b.ts', name: 'B' } },
    ];

    const groups = groupDeclarations(decls);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.similarity).toBe(1);
    expect(groups[0]?.decls).toHaveLength(2);
  });

  it('groups structurally similar shapes when below threshold', () => {
    const decls = [
      {
        id: '1',
        kind: 'kind',
        shape: { foo: 'bar' },
        location: { file: 'a.ts', name: 'A' },
      },
      {
        id: '2',
        kind: 'kind',
        shape: { foo: 'baz' },
        location: { file: 'b.ts', name: 'B' },
      },
    ];

    const groups = groupDeclarations(decls, 0.9);

    expect(groups.some(g => g.similarity < 1)).toBe(true);
    expect(groups.find(g => g.similarity < 1)?.decls).toHaveLength(2);
  });

  it('does not group unrelated shapes when below threshold', () => {
    const decls = [
      { id: '1', kind: 'kind', shape: { foo: 'bar' }, location: { file: 'a.ts', name: 'A' } },
      { id: '2', kind: 'kind', shape: { baz: 'qux' }, location: { file: 'b.ts', name: 'B' } },
    ];

    const groups = groupDeclarations(decls, 0.9);

    // Should not match: structuralSim would be too low.
    const hasFuzzy = groups.some(g => g.similarity < 1);
    expect(hasFuzzy).toBe(false);
  });

  it('returns empty if there are no duplicates', () => {
    const decls = [
      { id: '1', kind: 'kind', shape: { a: 1 }, location: { file: 'a.ts', name: 'A' } },
      { id: '2', kind: 'kind', shape: { b: 2 }, location: { file: 'b.ts', name: 'B' } },
    ];

    const groups = groupDeclarations(decls);

    expect(groups).toHaveLength(0);
  });
});
