import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import './index';
import { findDuplicates } from '@dry-lint/dry-lint';
import SwaggerParser from '@apidevtools/swagger-parser';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dry-openapi-'));
const write = (dir: string, name: string, data: any, ext = '.json') => {
  const fp = path.join(dir, `${name}${ext}`);
  fs.writeFileSync(fp, ext === '.json' ? JSON.stringify(data) : data);
  return fp;
};

vi.mock('@apidevtools/swagger-parser', () => {
  return {
    default: {
      dereference: vi.fn(async (_filePath: string, doc: any) => doc),
    },
  };
});

describe('OpenAPI extractor edge-cases', () => {
  let dir: string;
  const deref = SwaggerParser.dereference as unknown as Mock;

  beforeEach(() => {
    dir = tmp();
    deref.mockClear();
  });
  afterEach(() => fs.removeSync(dir));

  it('returns [] for unsupported file extensions', async () => {
    const txt = write(dir, 'readme', 'just text', '.txt');
    const groups = await findDuplicates([txt], { threshold: 1, json: true });
    expect(groups).toEqual([]);
    expect(deref).not.toHaveBeenCalled();
  });

  it('returns [] when components.schemas is absent', async () => {
    const doc = { openapi: '3.1.0', info: {}, paths: {} };
    const fp = write(dir, 'api', doc); // .json
    const groups = await findDuplicates([fp], { threshold: 1, json: true });
    expect(groups).toEqual([]);
    expect(deref).toHaveBeenCalledOnce();
  });

  it('falls back to YAML parsing if JSON.parse throws', async () => {
    const yaml = `
      openapi: 3.0.0
      info: { title: t, version: 1 }
      components: { schemas: { S: { type: string } } }
    `;
    const fp = write(dir, 'api', yaml, '.yaml');
    const groups = await findDuplicates([fp], { threshold: 1, json: true });
    expect(groups).toHaveLength(0);
    expect(deref).toHaveBeenCalledOnce();
  });

  it('detects dupes between JSON and YAML docs', async () => {
    const jsonDoc = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      components: { schemas: { S: { type: 'string' } } },
      paths: {},
    };
    const fp1 = write(dir, 'api', jsonDoc);
    const fp2 = write(
      dir,
      'api2',
      `openapi: 3.0.0
info: { title: t, version: 1 }
components: { schemas: { S: { type: string } } }
paths: {}
`,
      '.yaml'
    );
    const groups = await findDuplicates([fp1, fp2], { threshold: 1, json: true });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.similarity).toBe(1);
  });
});
