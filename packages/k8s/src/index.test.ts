import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Test suite for the Kubernetes YAML extractor plugin.
 * Validates correct extraction of multiple resources and duplicate detection across files.
 */
describe('Kubernetes YAML plugin', () => {
  it('extracts multiple resources from a single YAML document without duplicates', async () => {
    // Create a temporary directory and write a multi-document YAML file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-k8s-'));
    const yamlContent = `
apiVersion: v1
kind: Service
metadata:
  name: svc
spec:
  ports:
    - port: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dep
spec:
  replicas: 2
`;
    const filePath = path.join(tmpDir, 'res.yaml');
    fs.writeFileSync(filePath, yamlContent);

    // Run duplicate detection at full similarity threshold
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });

    // Two distinct resources should yield no duplicate groups
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate resource definitions across separate files', async () => {
    // Create a temporary directory and two identical YAML files
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-k8s-dup-'));
    const snippet = `
apiVersion: v1
kind: Service
metadata:
  name: foo
spec:
  ports:
    - port: 8080
`;
    const fileA = path.join(tmpDir, 'a.yaml');
    const fileB = path.join(tmpDir, 'b.yaml');
    fs.writeFileSync(fileA, snippet);
    fs.writeFileSync(fileB, snippet);

    // Run duplicate detection on both files
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect exactly one duplicate group for the 'foo' resource
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Both declarations should reference the same resource name 'foo'
    const resourceNames = group.decls.map(d => d.location.name).sort();
    expect(resourceNames).toEqual(['foo', 'foo']);
  });
});
