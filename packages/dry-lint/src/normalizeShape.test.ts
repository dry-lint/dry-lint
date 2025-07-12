import { describe, expect, it } from 'vitest';
import { normalizeShape } from './normalizeShape.js';

describe('normalizeShape', () => {
  it('keeps primitive leaf values (only sorts keys)', () => {
    const input = { foo: 'bar', num: 123, flag: true };
    const output = normalizeShape(input);

    expect(output).toEqual({ flag: true, foo: 'bar', num: 123 });
  });

  it('handles nested objects recursively', () => {
    const input = { user: { name: 'Alice', age: 30 } };
    const output = normalizeShape(input);

    expect(output).toEqual({ user: { age: 30, name: 'Alice' } });
  });

  it('handles arrays recursively', () => {
    const input = { items: [1, 2, 3], mixed: [{ a: 'b' }, { c: true }] };
    const output = normalizeShape(input);

    expect(output).toEqual({
      items: [1, 2, 3],
      mixed: [{ a: 'b' }, { c: true }],
    });
  });

  it('returns the same primitive for non-object input', () => {
    expect(normalizeShape('hello')).toBe('hello');
    expect(normalizeShape(42)).toBe(42);
    expect(normalizeShape(true)).toBe(true);
    expect(normalizeShape(null)).toBeNull();
  });
});
