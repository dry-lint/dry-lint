import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collectDeclarations } from './collectDeclarations.js';
import { extractorRegistry } from './registry.js';

describe('collectDeclarations', () => {
  beforeEach(() => {
    extractorRegistry.clear();
  });

  afterEach(() => {
    extractorRegistry.clear();
  });

  it('collects declarations from a sync extractor', async () => {
    extractorRegistry.add((filePath, text) => {
      return [{ id: '1', kind: 'test', shape: {}, location: { file: filePath, name: 'A' } }];
    });

    const files = [{ path: 'foo.ts', text: 'content' }];
    const result = await collectDeclarations(files);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '1', location: { file: 'foo.ts' } });
  });

  it('collects declarations from an async extractor', async () => {
    extractorRegistry.add(async (filePath, text) => {
      return [{ id: '2', kind: 'test', shape: {}, location: { file: filePath, name: 'B' } }];
    });

    const files = [{ path: 'bar.ts', text: 'more' }];
    const result = await collectDeclarations(files);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '2', location: { file: 'bar.ts' } });
  });

  it('collects and combines results from multiple extractors', async () => {
    extractorRegistry.add((filePath, text) => [
      { id: '1', kind: 'test', shape: {}, location: { file: filePath, name: 'A' } },
    ]);
    extractorRegistry.add(async (filePath, text) => [
      { id: '2', kind: 'test', shape: {}, location: { file: filePath, name: 'B' } },
    ]);

    const files = [{ path: 'multi.ts', text: 'multi' }];
    const result = await collectDeclarations(files);

    expect(result).toHaveLength(2);
    expect(result.map(d => d.id)).toContain('1');
    expect(result.map(d => d.id)).toContain('2');
  });

  it('returns empty if no extractors are registered', async () => {
    const files = [{ path: 'empty.ts', text: 'nothing' }];
    const result = await collectDeclarations(files);

    expect(result).toHaveLength(0);
  });
});
