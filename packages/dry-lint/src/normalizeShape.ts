/**
 * Canonical-ises an arbitrary JSON-serialisable value so that
 *  • object keys are sorted (makes order irrelevant)
 *  • nested arrays / objects are handled recursively
 *  • primitive *values* are kept, so `true ≠ false`
 */
export function normalizeShape(obj: unknown): unknown {
  if (obj === null) return null; // keep value, don’t coerce
  if (Array.isArray(obj)) return obj.map(normalizeShape);

  if (typeof obj !== 'object') return obj; // keep primitive value

  const dict = obj as Record<string, unknown>;
  const keys = Object.keys(dict).sort();
  const out: Record<string, unknown> = {};

  for (const k of keys) out[k] = normalizeShape(dict[k]);
  return out;
}
