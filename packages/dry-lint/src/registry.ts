import type { Extractor } from './types.js';

const REG_KEY = Symbol.for('dry-lint.extractorRegistry');
const g = globalThis as any;

if (!g[REG_KEY]) g[REG_KEY] = new Set<Extractor>();

export const extractorRegistry: Set<Extractor> = g[REG_KEY];

export function registerExtractor(fn: Extractor) {
  extractorRegistry.add(fn);
}

export function _clearRegistryForTests() {
  extractorRegistry.clear();
}
