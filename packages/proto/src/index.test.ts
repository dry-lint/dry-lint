import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { findDuplicates } from '@dry-lint/dry-lint';
import './index';

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dry-proto-'));

function write(dir: string, name: string, content: string) {
  fs.writeFileSync(path.join(dir, name), content);
}

describe('Protocol Buffers extractor plugin', () => {
  it('logs and skips on parse error', async () => {
    const dir = tmpDir();
    const file = path.join(dir, 'broken.proto');
    write(dir, 'broken.proto', 'not a proto');

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groups = await findDuplicates([file], { threshold: 1, json: true });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('⚠️ Proto parse error in'),
      expect.anything()
    );
    expect(groups).toEqual([]);
    spy.mockRestore();
  });

  it('extracts and deduplicates messages and enums', async () => {
    const dir = tmpDir();
    const content = `
      syntax = "proto3";
      message User { int32 id = 1; string name = 2; }
      enum Role { ADMIN = 0; USER = 1; }
    `;
    const a = path.join(dir, 'a.proto');
    const b = path.join(dir, 'b.proto');
    write(dir, 'a.proto', content);
    write(dir, 'b.proto', content);

    const groups = await findDuplicates([a, b], { threshold: 1, json: true });
    expect(groups).toHaveLength(2);

    const names = groups.map(g => g.decls.map(d => d.location.name).sort());
    expect(names).toContainEqual(['User', 'User']);
    expect(names).toContainEqual(['Role', 'Role']);
  });

  it('handles nested messages recursion', async () => {
    const dir = tmpDir();
    const content = `
      syntax = "proto3";
      package pkg;
      message Outer {
        message Inner { int32 x = 1; }
        int32 y = 2;
      }
    `;
    const a = path.join(dir, 'a.proto');
    const b = path.join(dir, 'b.proto');
    write(dir, 'a.proto', content);
    write(dir, 'b.proto', content);

    const groups = await findDuplicates([a, b], { threshold: 1, json: true });
    const names = groups.map(g => g.decls.map(d => d.location.name).sort());

    expect(names).toContainEqual(['pkg.Outer', 'pkg.Outer']);
    expect(names).toContainEqual(['pkg.Outer.Inner', 'pkg.Outer.Inner']);
  });
});
