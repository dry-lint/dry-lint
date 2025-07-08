import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import { writeFixFile as _writeFixFile } from './writeFixFile.js';

// spy on fs.writeFileSync
vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
  },
}));
const fsMock = fs as unknown as { writeFileSync: ReturnType<typeof vi.fn> };

describe('core › writeFixFile', () => {
  it('writes alias stubs for exact duplicate groups', () => {
    const groups = [
      {
        similarity: 1,
        decls: [
          { id: 'a', kind: 't', shape: {}, location: { file: 'f', name: 'Foo' } },
          { id: 'b', kind: 't', shape: {}, location: { file: 'f', name: 'Bar' } },
        ],
      },
    ];
    _writeFixFile(groups as any, 'out.ts');
    expect(fsMock.writeFileSync).toHaveBeenCalled();
    const content = fsMock.writeFileSync.mock.calls[0]![1] as string;
    expect(content).toMatch(/export type Foo/);
    expect(content).toMatch(/export type Bar = Foo/);
  });
});
