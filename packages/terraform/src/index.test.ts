import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Test suite for the Terraform/HCL extractor plugin.
 * Validates extraction of resource and variable blocks and duplicate detection.
 */
describe('Terraform/HCL plugin', () => {
  it('extracts resource and variable blocks from a .tf file without duplicates', async () => {
    // Create a temporary directory and write a Terraform file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-tf-'));
    const hclContent = `
      resource "aws_s3_bucket" "mybucket" {
        bucket = "example-bucket"
        acl    = "private"
      }

      variable "region" {
        type    = string
        default = "us-west-2"
      }
    `;
    const tfFile = path.join(tmpDir, 'main.tf');
    fs.writeFileSync(tfFile, hclContent);

    // Run duplicate detection; expect no duplicates among two distinct blocks
    const groups = await findDuplicates([tfFile], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate resource blocks across multiple .tf files', async () => {
    // Prepare two Terraform files defining the same resource block
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-tf-dup-'));
    const snippet = `
      resource "aws_s3_bucket" "dup" {
        bucket = "dup"
      }
    `;
    const fileA = path.join(tmpDir, 'a.tf');
    const fileB = path.join(tmpDir, 'b.tf');
    fs.writeFileSync(fileA, snippet);
    fs.writeFileSync(fileB, snippet);

    // Run duplicate detection across both files at full similarity threshold
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect one duplicate group for the 'dup' resource block
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Both declarations should reference the same block name 'dup'
    const names = group.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['dup', 'dup']);
  });
});
