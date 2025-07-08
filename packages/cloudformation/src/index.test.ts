import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { _clearRegistryForTests } from '@dry-lint/dry-lint';

// helpers
const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cfn-'));
const writeFile = (dir: string, name: string, data: string) =>
  fs.writeFileSync(path.join(dir, name), data);

// load extractor
const load = async () => {
  _clearRegistryForTests();
  await import('./index.js');
  const { findDuplicates } = await import('@dry-lint/dry-lint');
  return findDuplicates;
};

describe('CloudFormation extractor', () => {
  const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const yamlTpl = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Name: foo
  Queue:
    Type: AWS::SQS::Queue
`;

  const jsonTpl = JSON.stringify({
    AWSTemplateFormatVersion: '2010-09-09',
    Resources: {
      JsonRes: { Type: 'AWS::Lambda::Function', Properties: { Handler: 'h' } },
    },
  });

  it('extracts YAML resources (no duplicates)', async () => {
    const dir = mkTmp();
    writeFile(dir, 'tpl.yaml', yamlTpl);

    const groups = await (
      await load()
    )([path.join(dir, 'tpl.yaml')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('extracts JSON resources', async () => {
    const dir = mkTmp();
    writeFile(dir, 'tpl.json', jsonTpl);

    const groups = await (
      await load()
    )([path.join(dir, 'tpl.json')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('detects duplicate resources across files', async () => {
    const dir = mkTmp();
    const single = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  Dup:
    Type: AWS::DynamoDB::Table
`;
    writeFile(dir, 'a.yaml', single);
    writeFile(dir, 'b.yaml', single);

    const groups = await (
      await load()
    )([path.join(dir, 'a.yaml'), path.join(dir, 'b.yaml')], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.similarity).toBe(1);
    const names = groups[0]!.decls.map(d => d.location.name).sort();
    expect(names).toEqual(['Dup', 'Dup']);
  });

  it('skips when Resources is missing or not an object', async () => {
    const dir1 = mkTmp();
    writeFile(dir1, 'none.yaml', 'AWSTemplateFormatVersion: "2010-09-09"');
    const dir2 = mkTmp();
    writeFile(dir2, 'bad.yaml', 'Resources: []');

    const fn = await load();
    const g1 = await fn([path.join(dir1, 'none.yaml')], { threshold: 1, json: true });
    const g2 = await fn([path.join(dir2, 'bad.yaml')], { threshold: 1, json: true });
    expect(g1).toHaveLength(0);
    expect(g2).toHaveLength(0);
  });

  it('skips non-object resource entries', async () => {
    const dir = mkTmp();
    const tpl = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  X: null
  Y:
    Type: AWS::SNS::Topic
`;
    writeFile(dir, 'mix.yaml', tpl);

    const groups = await (
      await load()
    )([path.join(dir, 'mix.yaml')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
  });

  it('handles YAML parse errors gracefully', async () => {
    vi.doMock('js-yaml', () => ({
      load: () => {
        throw new Error('boom');
      },
    }));
    const dir = mkTmp();
    writeFile(dir, 'err.yaml', 'not: valid: yaml:');

    const groups = await (
      await load()
    )([path.join(dir, 'err.yaml')], {
      threshold: 1,
      json: true,
    });
    expect(groups).toHaveLength(0);
    expect(errSpy).toHaveBeenCalled();
  });

  it('treats distinct resources below threshold as unique', async () => {
    const dir = mkTmp();
    writeFile(
      dir,
      'a.yaml',
      `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  A: { Type: AWS::S3::Bucket }
`
    );
    writeFile(
      dir,
      'b.yaml',
      `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  B: { Type: AWS::S3::Bucket }
`
    );

    const groups = await (
      await load()
    )([path.join(dir, 'a.yaml'), path.join(dir, 'b.yaml')], { threshold: 0.9, json: true });
    expect(groups).toHaveLength(0);
  });
});
