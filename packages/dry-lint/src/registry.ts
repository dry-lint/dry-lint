import type { Extractor } from './types.js';

export interface ExtractorOptions<TShape = unknown> {
  isDuplicate?: (a: TShape, b: TShape) => boolean;
}

type AnyExtractor = Extractor;
const REG_KEY = Symbol.for('dry-lint.extractorRegistry');
const g = globalThis as { [REG_KEY]?: Set<AnyExtractor> };

if (!g[REG_KEY]) g[REG_KEY] = new Set<AnyExtractor>();
export const extractorRegistry = g[REG_KEY]!;

const extractorOpts = new WeakMap<AnyExtractor, ExtractorOptions<any>>();
export const _getExtractorOpts = (e: AnyExtractor) => extractorOpts.get(e);

export function registerExtractor<TShape>(fn: Extractor<TShape>): Extractor<TShape>;
export function registerExtractor<TShape>(
  fn: Extractor<TShape>,
  opts: ExtractorOptions<TShape>
): Extractor<TShape>;
export function registerExtractor<TShape>(
  fn: Extractor<TShape>,
  opts: ExtractorOptions<TShape> = {}
): Extractor<TShape> {
  extractorRegistry.add(fn as AnyExtractor);
  extractorOpts.set(fn as AnyExtractor, opts);
  return fn;
}

/* ---------- test helper ---------- */
export function _clearRegistryForTests() {
  extractorRegistry.clear();
}
