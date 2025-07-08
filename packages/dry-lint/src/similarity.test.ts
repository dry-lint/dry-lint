import { describe, it, expect } from 'vitest';
import { hashShape, structuralSim } from './similarity.js';

describe('hashShape', () => {
  it('produces a stable hash for the same shape', () => {
    const shape = { foo: 'bar', baz: [1, 2, 3] };
    const hash1 = hashShape(shape);
    const hash2 = hashShape(shape);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('produces different hashes for different shapes', () => {
    const shape1 = { foo: 'bar' };
    const shape2 = { foo: 'baz' };

    const hash1 = hashShape(shape1);
    const hash2 = hashShape(shape2);

    expect(hash1).not.toBe(hash2);
  });
});

describe('structuralSim', () => {
  it('returns 1 for identical shapes', () => {
    const a = { foo: 'bar', nested: { x: 1 } };
    const b = { foo: 'bar', nested: { x: 1 } };

    const sim = structuralSim(a, b);
    expect(sim).toBe(1);
  });

  it('returns a value between 0 and 1 for similar shapes', () => {
    const a = { foo: 'bar', extra: true };
    const b = { foo: 'bar', extra: false };

    const sim = structuralSim(a, b);
    expect(sim).toBeLessThan(1);
    expect(sim).toBeGreaterThan(0);
  });

  it('returns a low similarity for completely different shapes', () => {
    const a = { foo: 'bar' };
    const b = { unrelated: 12345 };

    const sim = structuralSim(a, b);
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThan(0.3);
  });
});
