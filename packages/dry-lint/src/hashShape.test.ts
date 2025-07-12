import { describe, expect, it } from 'vitest';
import { hashShape } from './hashShape.js';

describe('hashShape', () => {
  it('produces a stable hash for the same shape', () => {
    const shape = { foo: 'bar', baz: [1, 2, 3] };
    const hash1 = hashShape(shape);
    const hash2 = hashShape(shape);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBeGreaterThan(0);
  });

  it('produces different hashes for different structures', () => {
    const shape1 = { foo: 'bar' };
    const shape2 = { foo: { nested: true } };

    const hash1 = hashShape(shape1);
    const hash2 = hashShape(shape2);

    expect(hash1).not.toBe(hash2);
  });
});
