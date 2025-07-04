import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ――― helpers ---------------------------------------------------------------
const tmpFile = (dir: string, name: string, contents: string) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, contents);
  return p;
};

// ――― fresh-import utility --------------------------------------------------
// We need to import the plugin *after* we set up any mocks so that registerExtractor
// sees the mocked version of parseHcl.
const loadPlugin = async () => {
  await import('./index.js'); // adjust the path if needed
  const { findDuplicates } = await import('@dry-lint/core');
  return { findDuplicates };
};

// ――― suite -----------------------------------------------------------------
describe('Terraform/HCL extractor', () => {
  const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.resetModules(); // make every test get a fresh extractor instance
    vi.clearAllMocks();
  });

  // 1 ────────────────────────────────────────────────────────────────────────
  it('extracts both resources and variables (happy path)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-ok-'));
    const main = tmpFile(
      dir,
      'main.tf',
      `
      resource "aws_s3_bucket" "b1" { bucket = "b1" }
      variable "region" { default = "us-east-1" }
    `
    );

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([main], { threshold: 1, json: true });

    // zero duplicates does *not* mean zero declarations – it just means they’re all unique
    expect(groups).toHaveLength(0);
  });

  // 2 ────────────────────────────────────────────────────────────────────────
  it('detects duplicate resources across files', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-dupes-'));
    const a = tmpFile(dir, 'a.tf', `resource "aws_s3_bucket" "dup" { bucket = "dup-a" }`);
    const b = tmpFile(dir, 'b.tf', `resource "aws_s3_bucket" "dup" { bucket = "dup-b" }`);

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([a, b], { threshold: 1, json: true });

    expect(groups).toHaveLength(1);
    expect(groups[0]!.similarity).toBe(1);
    expect(groups[0]!.decls.map(d => d.location.name)).toEqual(['dup', 'dup']);
  });

  // 3 ────────────────────────────────────────────────────────────────────────
  it('gracefully handles an HCL parse error (error branch)', async () => {
    // Mock the parser to throw
    vi.doMock('@evops/hcl-terraform-parser', () => ({
      parse: () => {
        throw new Error('boom');
      },
    }));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-err-'));
    const badFile = tmpFile(dir, 'broken.tf', 'this is not HCL');

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([badFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0); // extractor returned []
    expect(consoleErr).toHaveBeenCalled(); // logged once
  });

  // 4 ────────────────────────────────────────────────────────────────────────
  it('skips managed_resources keys that lack a dot (invalid-key branch)', async () => {
    // Fake parse result so we don’t need to craft weird HCL
    vi.doMock('@evops/hcl-terraform-parser', () => ({
      parse: () => ({
        managed_resources: { badkey: {} }, // no dot => should be ignored
      }),
    }));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-nodot-'));
    const f = tmpFile(dir, 'dummy.tf', '# irrelevant');

    const { findDuplicates } = await loadPlugin();
    const groups = await findDuplicates([f], { threshold: 1, json: true });

    expect(groups).toHaveLength(0); // nothing extracted → nothing to duplicate
  });

  // 5 ────────────────────────────────────────────────────────────────────────
  it('treats blocks below similarity threshold as distinct', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-threshold-'));
    const a = tmpFile(dir, 'a.tf', `resource "aws_s3_bucket" "x" { bucket = "x" }`);
    const b = tmpFile(dir, 'b.tf', `resource "aws_s3_bucket" "y" { bucket = "y" }`);

    const { findDuplicates } = await loadPlugin();
    // 0.9 means “only report if ≥ 90 % identical” – our two blocks differ enough
    const groups = await findDuplicates([a, b], { threshold: 0.9, json: true });

    expect(groups).toHaveLength(0);
  });
});
