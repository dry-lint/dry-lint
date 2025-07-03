import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ────────── helpers ─────────────────────────────────────────────────────────
const tmpFile = (dir: string, name: string, contents: string) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, contents);
  return p;
};

// Load the plugin only *after* mocks are in place so registerExtractor
// receives the mocked deps.
const loadPlugin = async () => {
  await import('./index.js'); // adjust path as needed
  const { findDuplicates } = await import('@dry-lint/core');
  return { findDuplicates };
};

describe('Kubernetes YAML extractor', () => {
  const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.resetModules(); // fresh plugin instance per test
    vi.clearAllMocks();
  });

  // 1 ────────────────────────────────────────────────────────────────────────
  it('extracts multiple resources from one file – no duplicates', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-ok-'));
    const main = tmpFile(
      dir,
      'multi.yaml',
      `
apiVersion: v1
kind: Service
metadata: { name: svc }
spec: {}
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: dep }
spec: { replicas: 1 }`
    );

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([main], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  // 2 ────────────────────────────────────────────────────────────────────────
  it('detects duplicates across files', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-dupe-'));
    const content = `
apiVersion: v1
kind: ConfigMap
metadata: { name: foo }
data: { k: v }`;
    const a = tmpFile(dir, 'a.yaml', content);
    const b = tmpFile(dir, 'b.yaml', content);

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([a, b], { threshold: 1, json: true });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.similarity).toBe(1);
    expect(groups[0]!.decls.map(d => d.location.name)).toEqual(['foo', 'foo']);
  });

  // 3 ────────────────────────────────────────────────────────────────────────
  it('handles YAML parse errors (error branch)', async () => {
    vi.doMock('js-yaml', () => ({
      loadAll: () => {
        throw new Error('bad yaml');
      },
    }));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-err-'));
    const bad = tmpFile(dir, 'broken.yaml', '::::');

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([bad], { threshold: 1, json: true });
    expect(groups).toHaveLength(0); // extractor returned []
    expect(consoleErr).toHaveBeenCalled(); // logged parse error
  });

  // 4 ────────────────────────────────────────────────────────────────────────
  it('falls back to UnknownKind and <no-name> when fields are missing', async () => {
    vi.doMock('js-yaml', () => ({
      loadAll: () => [
        { apiVersion: 'v1' }, // missing kind + metadata.name
      ],
    }));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-fallback-'));
    const dummy = tmpFile(dir, 'dummy.yaml', '#');

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([dummy], { threshold: 1, json: true });
    expect(groups).toHaveLength(0); // only one decl, no dupes
  });

  // 5 ────────────────────────────────────────────────────────────────────────
  it('does not report below-threshold similarity as duplicate', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-thresh-'));
    const svc = tmpFile(
      dir,
      'svc.yaml',
      `apiVersion: v1\nkind: Service\nmetadata: { name: a }\nspec: {}` // Service
    );
    const dep = tmpFile(
      dir,
      'dep.yaml',
      `apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: b }\nspec: {}` // Deployment
    );

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([svc, dep], { threshold: 0.9, json: true });
    expect(groups).toHaveLength(0);
  });

  it('covers non-object YAML doc branch', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k8s-nonobj-'));
    const yaml = `
"not-an-object"          # scalar → should be skipped
---
kind: ConfigMap          # object → normal path
metadata: { name: test }
spec: {}
`;
    const file = tmpFile(dir, 'mixed.yaml', yaml);

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([file], { threshold: 1, json: true });

    expect(groups).toHaveLength(0);
  });
});
