import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import '../src/index';
import { findDuplicates } from '@dry-lint/core';

/**
 * Sample CloudFormation template in YAML format for testing resource extraction.
 */
const simpleTemplateYAML = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
  MyQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: my-queue
`;

describe('CloudFormation plugin', () => {
  it('extracts distinct resources from a single YAML template without duplicates', async () => {
    // Create a temporary directory and write the template
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-cfn-'));
    const filePath = path.join(tmpDir, 'template.yaml');
    fs.writeFileSync(filePath, simpleTemplateYAML);

    // Run duplicate detection with a perfect similarity threshold
    const groups = await findDuplicates([filePath], { threshold: 1, json: true });

    // Expect no duplicate groups since two different resources exist
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate resource definitions across multiple templates', async () => {
    // Prepare two template files with the same single resource
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-cfn-dup-'));
    const templateContent = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  DupRes:
    Type: AWS::DynamoDB::Table
`;
    const fileA = path.join(tmpDir, 'a.yaml');
    const fileB = path.join(tmpDir, 'b.yaml');
    fs.writeFileSync(fileA, templateContent);
    fs.writeFileSync(fileB, templateContent);

    // Run duplicate detection on both files
    const groups = await findDuplicates([fileA, fileB], { threshold: 1, json: true });

    // Expect exactly one duplicate group with full similarity
    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.similarity).toBe(1);

    // Verify both declarations reference the same logical resource ID
    const resourceNames = group.decls.map(d => d.location.name).sort();
    expect(resourceNames).toEqual(['DupRes', 'DupRes']);
  });
});
