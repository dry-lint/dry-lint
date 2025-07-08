import { extractorRegistry } from './registry.js';
import type { Declaration } from './types.js';

export async function collectDeclarations(
  files: Array<{ path: string; text: string }>
): Promise<Declaration[]> {
  const all: Declaration[] = [];
  for (const f of files) {
    for (const ext of extractorRegistry) {
      const result = ext(f.path, f.text);
      const decls = result instanceof Promise ? await result : result;
      all.push(...decls);
    }
  }
  return all;
}
