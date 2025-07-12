import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _clearRegistryForTests,
  _getExtractorOpts,
  extractorRegistry,
  registerExtractor,
} from './registry.js';
import type { Extractor } from './types.js';

describe('extractorRegistry', () => {
  beforeEach(() => {
    _clearRegistryForTests();
  });

  it('adds extractors to the singleton registry', () => {
    const fn: Extractor = () => [];
    const ret = registerExtractor(fn);

    expect(ret).toBe(fn);
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

    const fresh = (globalThis as any)[regKey] as Set<Extractor>;
    expect(fresh.has(fn)).toBe(true);
  });

  describe('options handling', () => {
    it('returns undefined for unregistered extractor opts', () => {
      const fn: Extractor = () => [];
      expect(_getExtractorOpts(fn)).toBeUndefined();
    });

    it('stores and retrieves default (empty) opts when none provided', () => {
      const fn: Extractor = () => [];
      registerExtractor(fn);
      const opts = _getExtractorOpts(fn);
      expect(opts).toEqual({}); // default empty object
      expect(typeof opts?.isDuplicate).toBe('undefined');
    });

    it('stores and retrieves provided options', () => {
      const fn: Extractor<string> = () => [];
      const customIsDup = vi.fn((a, b) => a === b);
      const passedOpts = { isDuplicate: customIsDup };
      registerExtractor(fn, passedOpts);

      const stored = _getExtractorOpts(fn);
      expect(stored).toBe(passedOpts);
      expect(stored?.isDuplicate).toBe(customIsDup);

      // verify that the function itself is still in registry
      expect(extractorRegistry.has(fn)).toBe(true);
    });
  });
});
