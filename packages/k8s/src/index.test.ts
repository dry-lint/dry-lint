import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { _clearRegistryForTests } from '@dry-lint/dry-lint';

const tmpFile = (dir: string, name: string, contents: string): string => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, contents);
  return p;
};

let tmpDir: string;
let findDuplicates: typeof import('@dry-lint/dry-lint').findDuplicates;
const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

beforeAll(async () => {
  _clearRegistryForTests();
  await import('./index.js');
  ({ findDuplicates } = await import('@dry-lint/dry-lint'));

  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  consoleErr.mockRestore();
});

describe('Kubernetes YAML extractor', () => {
  it('extracts multiple resources from one file – no duplicates', async () => {
    const main = tmpFile(
      tmpDir,
      'multi.yaml',
      `\napiVersion: v1\nkind: Service\nmetadata: { name: svc }\nspec: {}\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata: { name: dep }\nspec: { replicas: 1 }\n`
    );

    const groups = await findDuplicates([main], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicates across files', async () => {
    const content = `\napiVersion: v1\nkind: ConfigMap\nmetadata: { name: foo }\ndata: { k: v }`;

    const a = tmpFile(tmpDir, 'a.yaml', content);
    const b = tmpFile(tmpDir, 'b.yaml', content);

    const groups = await findDuplicates([a, b], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);

    const group = groups[0]!;
    expect(group.similarity).toBe(1);
    expect(group.decls.map(d => d.location.name)).toEqual(['foo', 'foo']);
  });

  it('handles YAML parse errors gracefully', async () => {
    // Force js-yaml to throw so we can verify the error branch
    const loadSpy = vi.spyOn(yaml, 'loadAll').mockImplementation(() => {
      throw new Error('bad yaml');
    });

    const bad = tmpFile(tmpDir, 'broken.yaml', '::::');

    const groups = await findDuplicates([bad], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
    expect(consoleErr).toHaveBeenCalled();

    loadSpy.mockRestore();
  });

  it('falls back to UnknownKind and <no-name> when fields are missing', async () => {
    const miss = tmpFile(
      tmpDir,
      'missing.yaml',
      `\napiVersion: v1\n# kind omitted on purpose\nmetadata: {}\n`
    );

    const groups = await findDuplicates([miss], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('does not report below-threshold similarity as duplicate', async () => {
    const svc = tmpFile(
      tmpDir,
      'svc.yaml',
      `apiVersion: v1\nkind: Service\nmetadata: { name: a }\nspec: {}`
    );

    const dep = tmpFile(
      tmpDir,
      'dep.yaml',
      `apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: b }\nspec: {}`
    );

    const groups = await findDuplicates([svc, dep], { threshold: 0.9, json: true });
    expect(groups).toHaveLength(0);
  });

  it('skips non-object YAML documents', async () => {
    const mix = tmpFile(
      tmpDir,
      'mixed.yaml',
      `"not-an-object"\n---\nkind: ConfigMap\nmetadata: { name: test }\nspec: {}`
    );

    const groups = await findDuplicates([mix], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });
});
