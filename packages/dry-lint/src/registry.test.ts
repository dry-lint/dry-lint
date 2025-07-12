import { beforeEach, describe, expect, it } from 'vitest';
import { _clearRegistryForTests, extractorRegistry, registerExtractor } from './registry.js';
import type { Extractor } from './types.js';

describe('extractorRegistry', () => {
  beforeEach(() => {
    _clearRegistryForTests();
  });

  it('adds extractors to the singleton registry', () => {
    const fn: Extractor = () => [];
    registerExtractor(fn);

    expect(extractorRegistry.has(fn)).toBe(true);
    expect(extractorRegistry.size).toBe(1);
  });

  it('keeps extractors across multiple register calls', () => {
    const fn1: Extractor = () => [];
    const fn2: Extractor = () => [];

    registerExtractor(fn1);
    registerExtractor(fn2);

    expect(extractorRegistry.has(fn1)).toBe(true);
    expect(extractorRegistry.has(fn2)).toBe(true);
    expect(extractorRegistry.size).toBe(2);
  });

  it('clears the registry with _clearRegistryForTests', () => {
    const fn: Extractor = () => [];
    registerExtractor(fn);
    expect(extractorRegistry.size).toBe(1);

    _clearRegistryForTests();
    expect(extractorRegistry.size).toBe(0);
  });

  it('uses globalThis to store the singleton', () => {
    const regKey = Symbol.for('dry-lint.extractorRegistry');
    expect((globalThis as any)[regKey]).toBe(extractorRegistry);

    const fn: Extractor = () => [];
    registerExtractor(fn);

    // If we grab it fresh, it's still the same Set
    const fresh = (globalThis as any)[regKey] as Set<Extractor>;
    expect(fresh.has(fn)).toBe(true);
  });
});
